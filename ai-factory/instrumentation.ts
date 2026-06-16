/**
 * Next.js Instrumentation
 * 在服务启动时自动启动 Claudeck 服务
 */

export async function register() {
  // 只在 Node.js 环境运行（不在 Edge Runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 AI Factory 正在启动...');
    console.log('='.repeat(50));

    // 动态导入避免在构建时报错
    const { claudeckIntegrated } = await import('./server/services/claudeck-integrated.service');

    try {
      const started = await claudeckIntegrated.start();
      if (started) {
        console.log('✅ Claudeck 服务已集成');
      } else {
        console.log('⚠️ Claudeck 服务启动失败，将使用降级模式');
      }
    } catch (err) {
      console.error('❌ Claudeck 启动错误:', err);
    }

    console.log('='.repeat(50) + '\n');

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('\n正在关闭服务...');
      await claudeckIntegrated.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n正在关闭服务...');
      await claudeckIntegrated.stop();
      process.exit(0);
    });
  }
}