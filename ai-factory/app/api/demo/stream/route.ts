import { NextRequest } from 'next/server';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';
import { DemoEventBusService } from '@/server/services/demo-event-bus.service';

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId 参数必填' }), { status: 400 });
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return new Response(JSON.stringify({ error: '项目不存在' }), { status: 404 });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: any) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // controller already closed
          }
        };

        // Send existing history first
        const history = DemoEventBusService.getHistory(projectId);
        for (const event of history) {
          sendEvent(event);
        }

        // If already closed and has done event, just close
        if (DemoEventBusService.isClosed(projectId)) {
          const hasDone = history.some((e) => e.kind === 'done');
          if (!hasDone) {
            sendEvent({ id: 0, kind: 'done' as const, ts: Date.now(), data: {} });
          }
          controller.close();
          return;
        }

        // Subscribe to new events
        const unsubscribe = DemoEventBusService.subscribe(projectId, (event) => {
          sendEvent(event);
          if (event.kind === 'done' || event.kind === 'error') {
            unsubscribe();
            controller.close();
          }
        });

        // Cleanup on client disconnect
        const checkClosed = () => {
          if (DemoEventBusService.isClosed(projectId)) {
            unsubscribe();
            controller.close();
          }
        };
        const timer = setInterval(checkClosed, 10000);

        // We can't detect disconnect in Next.js App Router easily,
        // so we rely on the done event or timeout
        const cleanup = () => {
          clearInterval(timer);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        // Auto-close after 30 minutes max
        setTimeout(cleanup, 30 * 60 * 1000);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
