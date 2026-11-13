// Only return an application-local destination belonging to the signed-in role.
export function getLoginDestination(role, requested) {
  const home = role === 'admin' ? '/admin' : role === 'user' ? '/user' : '/';
  if (typeof requested !== 'string' || requested.length > 4096 || !requested.startsWith('/') || requested.startsWith('//') || requested.includes('\\') || Array.from(requested).some(c => c.charCodeAt(0) <= 32)) return home;
  try {
    const url = new URL(requested, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || (url.pathname !== home && !url.pathname.startsWith(home + '/')) || home === '/') return home;
    return url.pathname + url.search + url.hash;
  } catch { return home; }
}
