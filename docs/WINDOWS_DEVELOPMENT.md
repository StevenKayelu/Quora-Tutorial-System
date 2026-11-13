# Windows Application Control and the local frontend

On 13 November 2026, Windows Code Integrity event 3077 confirmed that the `VerifiedAndReputableDesktop` policy blocked the installed native Rollup module. The file existed; the wrapper's “Cannot find module” message hid `ERR_DLOPEN_FAILED` caused by Application Control.

Diagnostic identifiers:

- Package: `@rollup/rollup-win32-x64-msvc@4.14.2`.
- File: `node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node`.
- Signature: unsigned.
- SHA-256: `DC5C01B956A9AA46EF3835215B4147E199F6D1A7F6966EC9588F91D46FA299B0`.
- Policy GUID from the block event: `{0283ac0f-fff1-49ae-ada1-8a933130cad6}`.

The user confirmed this is their personal computer and explicitly approved replacing this project's blocked native Rollup build with Rollup's official WebAssembly build. Windows security settings and Application Control policies were not changed. No native binary was patched, renamed or unblocked.

`package.json` now declares the same Rollup version through npm's package alias and override:

```json
{
  "devDependencies": {
    "rollup": "npm:@rollup/wasm-node@4.14.2"
  },
  "overrides": {
    "rollup": "$rollup"
  }
}
```

The lockfile resolves the official `@rollup/wasm-node` tarball with its integrity hash. Vite remains 5.2.8, React 18.2.0 and esbuild 0.20.2. Rollup documents this package as a drop-in replacement: [Rollup 4 migration guide](https://rollupjs.org/migration). Alias/override behavior is documented in [npm package specifications](https://docs.npmjs.com/cli/v11/using-npm/package-spec/) and [package.json overrides](https://docs.npmjs.com/files/package.json/).

Start normally from the frontend directory:

```powershell
npm.cmd run dev -- --host localhost --port 5173 --strictPort
```

For this approved project setup, if an older existing node_modules tree still retains native Rollup after a normal install, the explicit package install that corrected npm's retained resolution was:

```powershell
npm.cmd install --save-dev --save-exact rollup@npm:@rollup/wasm-node@4.14.2 --ignore-scripts --no-audit --no-fund
```

The native load error was resolved. Vite import, TypeScript checking, the production build and local HTTP routes passed. Headless Edge verified student login/start/save/refresh/resume/submit/results and admin author/preview/save at 1440px and 390px, using isolated API fixtures. The production build retains its existing large-chunk and outdated Browserslist-data warnings. Development dependencies were installed with lifecycle scripts disabled. On another managed computer, have the policy owner review any blocked-tool changes before applying them.
