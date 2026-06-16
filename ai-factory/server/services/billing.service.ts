import { insert, queryAll, queryOne, update } from '@/lib/db';

const TOKENS_PER_POINT = 1000;

type DbUser = {
  id: string;
  balancePoints?: number;
  usedPoints?: number;
  usedTokens?: number;
};

type DbSession = {
  id: string;
  accountId: string;
  balanceBefore: number;
};

type DbStep = {
  id: string;
  sessionId: string;
  stepName: 'spec_generation' | 'code_generation';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  pointsCharged: number;
};


function toPoints(totalTokens: number) {
  return Number((totalTokens / TOKENS_PER_POINT).toFixed(2));
}

function getUser(accountId: string) {
  return queryOne('users', (u: any) => u.id === accountId) as DbUser | undefined;
}

function getSession(sessionId: string) {
  return queryOne('billingSessions' as any, (item: any) => item.id === sessionId) as DbSession | undefined;
}

function getStep(sessionId: string, stepName: 'spec_generation' | 'code_generation') {
  return (queryAll('billingSessionSteps' as any) as any[]).find(
    (item) => item.sessionId === sessionId && item.stepName === stepName,
  ) as DbStep | undefined;
}

export const BillingService = {
  async assertCanStartDemo(accountId: string) {
    const user = getUser(accountId);
    if (!user) throw new Error('账户不存在');
    if ((user.balancePoints ?? 0) <= 0) {
      throw new Error('当前点数不足，无法发起新的 demo 生成任务');
    }
    return user;
  },

  async createSession(accountId: string, projectId: string) {
    const user = await this.assertCanStartDemo(accountId);
    return insert('billingSessions' as any, {
      accountId,
      projectId,
      taskType: 'demo_generate',
      status: 'running',
      balanceBefore: user.balancePoints ?? 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      pointsCharged: 0,
      startedAt: new Date().toISOString(),
    });
  },

  async chargeStep(sessionId: string, stepName: 'spec_generation' | 'code_generation', model: string, inputTokens: number, outputTokens: number) {
    const existingStep = getStep(sessionId, stepName);
    if (existingStep) {
      return existingStep;
    }

    const session = getSession(sessionId);
    if (!session) throw new Error('账单会话不存在');
    const user = getUser(session.accountId);
    if (!user) throw new Error('账户不存在');

    const totalTokens = inputTokens + outputTokens;
    const pointsCharged = toPoints(totalTokens);
    const balanceBefore = Number(user.balancePoints ?? 0);
    const balanceAfter = Number((balanceBefore - pointsCharged).toFixed(2));
    if (balanceAfter < 0) {
      throw new Error('扣费后点数不足');
    }

    const step = await insert('billingSessionSteps' as any, {
      sessionId,
      stepName,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      pointsCharged,
      status: 'success',
      createdAt: new Date().toISOString(),
    });

    await update('users', (u: any) => u.id === session.accountId, {
      balancePoints: balanceAfter,
      usedPoints: Number(((user.usedPoints ?? 0) + pointsCharged).toFixed(2)),
      usedTokens: (user.usedTokens ?? 0) + totalTokens,
    });

    await update('billingSessions' as any, (item: any) => item.id === sessionId, {
      balanceAfter,
    });

    await insert('pointLedger' as any, {
      accountId: session.accountId,
      sessionId,
      changeType: 'consume',
      deltaPoints: -pointsCharged,
      balanceBefore,
      balanceAfter,
      remark: `step:${stepName}`,
      createdAt: new Date().toISOString(),
    });

    return step;
  },


  async finishSession(sessionId: string, status: 'completed' | 'failed', errorMessage?: string) {
    const session = getSession(sessionId);
    if (!session) throw new Error('账单会话不存在');
    const steps = (queryAll('billingSessionSteps' as any) as any[]).filter((item) => item.sessionId === sessionId);
    const totalInputTokens = steps.reduce((sum, item) => sum + (item.inputTokens || 0), 0);
    const totalOutputTokens = steps.reduce((sum, item) => sum + (item.outputTokens || 0), 0);
    const totalTokens = steps.reduce((sum, item) => sum + (item.totalTokens || 0), 0);
    const pointsCharged = toPoints(totalTokens);
    const user = getUser(session.accountId);
    if (!user) throw new Error('账户不存在');
    const currentBalance = user.balancePoints ?? 0;

    await update('billingSessions' as any, (item: any) => item.id === sessionId, {
      status,
      balanceAfter: currentBalance,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      pointsCharged,
      finishedAt: new Date().toISOString(),
      errorMessage,
    });

    const hasLedger = (queryAll('pointLedger' as any) as any[]).some((item) => item.sessionId === sessionId && item.remark === 'Demo task completed');
    if (status === 'completed' && pointsCharged > 0 && !hasLedger) {
      await insert('pointLedger' as any, {
        accountId: session.accountId,
        sessionId,
        changeType: 'consume',
        deltaPoints: -pointsCharged,
        balanceBefore: session.balanceBefore,
        balanceAfter: currentBalance,
        remark: 'Demo task completed',
        createdAt: new Date().toISOString(),
      });
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      pointsCharged,
      balanceBefore: session.balanceBefore,
      balanceAfter: currentBalance,
    };
  },
};
