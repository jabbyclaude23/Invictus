async page => {
  const results = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['/', '/workout', '/meals', '/trading', '/coach', '/auth']) {
      await page.goto(`http://127.0.0.1:4174${route}`);
      await page.getByRole('heading', { level: route === '/auth' ? 2 : 1 }).first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const layout = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const nav = document.querySelector(innerWidth >= 1024 ? '.app-sidebar' : '.app-bottom-nav');
        const rect = nav?.getBoundingClientRect();
        return { viewport, bodyWidth: document.body.scrollWidth, documentWidth: document.documentElement.scrollWidth, nav: rect ? { top: rect.top, bottom: rect.bottom } : null };
      });
      if (layout.documentWidth > width + 1 || layout.bodyWidth > width + 1) throw new Error(`Horizontal overflow ${width} ${route}: ${JSON.stringify(layout)}`);
      if (route !== '/auth' && (!layout.nav || layout.nav.top < 0 || layout.nav.bottom > 961)) throw new Error(`Navigation unavailable: ${width} ${route}`);
      if (route === '/coach') {
        const input = await page.getByRole('textbox', { name: 'Message Coach Invictus' }).boundingBox();
        const nav = await page.locator('.app-bottom-nav').boundingBox();
        if (!input || input.y < 0 || input.y + input.height > (width < 1024 ? nav.y : 960)) throw new Error(`Coach composer obscured ${width}`);
      }
      results.push(`${width}px ${route}: layout/navigation passed`);
      if (width === 1440 || width === 375) {
        await page.waitForTimeout(800);
        await page.screenshot({ path: `docs/previews/${route.slice(1) || 'dashboard'}-${width}.png` });
      }
    }
  }
  if (errors.length) throw new Error(`Runtime errors: ${errors.join('; ')}`);
  return { checks: results.length, results, runtimeErrors: errors };
}
