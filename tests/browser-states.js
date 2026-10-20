async page => {
  const base = 'http://127.0.0.1:4174';
  const checks = [];
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(`${base}/?empty=1`);
  await page.getByRole('heading', { name: 'Your routine starts here' }).waitFor();
  await page.getByRole('button', { name: 'Create your first habit' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add New Habit' });
  await dialog.waitFor();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    if (!await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]')))) throw new Error('Focus escaped habit dialog');
  }
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  checks.push('Empty dashboard is actionable; dialog focus cycles and Escape closes');
  await page.goto(`${base}/workout?empty=1`);
  await page.getByRole('heading', { name: 'Build Your Program', exact: true }).waitFor();
  checks.push('Empty workout opens real onboarding');
  await page.goto(`${base}/meals?empty=1`);
  await page.getByRole('heading', { name: 'Your Nutrition Plan', exact: true }).waitFor();
  checks.push('Empty meals opens nutrition setup');
  await page.goto(`${base}/trading?empty=1`);
  await page.getByRole('button', { name: 'Log your first trade', exact: true }).waitFor();
  checks.push('Empty trading journal offers first log action');
  await page.goto(`${base}/coach?empty=1`);
  await page.getByRole('button', { name: 'Build my training week', exact: false }).waitFor();
  await page.getByRole('button', { name: 'Build my training week', exact: false }).click();
  if (!(await page.getByRole('textbox', { name: 'Message Coach Invictus' }).inputValue()).startsWith('Help me plan')) throw new Error('Prompt starter did not fill draft');
  const sessions = await page.evaluate(() => Object.keys(window.__fixture.dump()).filter(key => /^users\/[^/]+\/coach_sessions\/[^/]+$/.test(key)).length);
  if (sessions !== 1) throw new Error(`Empty coach created ${sessions} duplicate sessions`);
  await page.getByRole('button', { name: 'Open conversation history' }).click();
  await page.getByRole('dialog', { name: 'Conversations', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Conversations', exact: true }).waitFor({ state: 'hidden' });
  checks.push('Empty Coach creates one session, prompt fills draft, mobile history supports Escape');
  await page.evaluate(() => { window.__fixture.failReads = true; });
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Dashboard', exact: true }).click();
  await page.getByText('Your dashboard could not be loaded. Check your connection and try again.').waitFor();
  await page.evaluate(() => { window.__fixture.failReads = false; });
  await page.getByText('Your dashboard could not be loaded. Check your connection and try again.').locator('..').getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('heading', { name: 'Your routine starts here' }).waitFor();
  checks.push('Dashboard failed read is visible and retry recovers');
  await page.goto(base);
  return { passed: checks.length, checks, scope: 'empty and failure fixtures only' };
}
