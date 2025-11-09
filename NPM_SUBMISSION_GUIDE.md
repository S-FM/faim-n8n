# NPM Submission Guide for @faim-group/n8n-nodes-faim

This guide walks you through submitting the FAIM n8n node to the npm registry and n8n community node repository.

## Pre-Submission Checklist

✅ **All items verified and ready:**

- [x] Package name: `@faim-group/n8n-nodes-faim` (starts with @scope/n8n-nodes-)
- [x] `n8n-community-node-package` keyword in package.json
- [x] n8n nodes and credentials properly defined in package.json
- [x] ESLint passes: `pnpm run lint` ✅
- [x] All tests pass: `pnpm test` ✅ (36/36 tests)
- [x] Build compiles: `pnpm run build` ✅
- [x] dist/ folder contains compiled .js and .d.ts files
- [x] README.md with comprehensive documentation
- [x] LICENSE file (MIT)
- [x] Source code properly typed (TypeScript strict mode)
- [x] Example workflows documented

## Step-by-Step Submission

### Step 1: Create npm Account (if needed)

If you don't have an npm account:
1. Go to https://www.npmjs.com/
2. Click "Sign Up"
3. Create account with email and password
4. Verify your email

### Step 2: Login to npm

```bash
npm login
```

You'll be prompted for:
- Username
- Password
- Email address
- One-time password (OTP) if 2FA is enabled

### Step 3: Verify Scoped Package Access

Since the package is scoped (`@faim-group/...`), you need publish access to the scope.

Check if you have permissions:
```bash
npm access list packages @faim-group
```

If you need to grant access or create the scope:
```bash
# Create scope (if not exists)
npm org create faim-group

# Add user to scope
npm org set faim-group @username developer
```

### Step 4: Final Pre-Publish Checks

```bash
# Verify all checks pass
pnpm run lint          # ✅ Should pass
pnpm test              # ✅ Should pass: 36/36 tests
pnpm run build         # ✅ Should complete successfully

# Verify package.json
cat package.json | jq '.name, .version, .n8n, .keywords'
```

Expected output:
```
@faim-group/n8n-nodes-faim
1.0.0
{
  "nodes": ["dist/nodes/FAIMForecast/FAIMForecast.node.js"],
  "credentials": ["dist/nodes/FAIMForecast/FAIMForecast.credentials.js"]
}
```

### Step 5: Publish to npm

```bash
npm publish --access public
```

**Important**: Use `--access public` for scoped packages - they default to private!

Expected output:
```
npm notice Publishing to the public npm registry
npm notice publishing @faim-group/n8n-nodes-faim@1.0.0
...
+ @faim-group/n8n-nodes-faim@1.0.0
```

Verify it's published:
```bash
npm view @faim-group/n8n-nodes-faim
```

### Step 6: Submit to n8n Community Node Registry

1. Go to: https://github.com/n8n-io/n8n-nodes-base
2. Create issue with title: "Add @faim-group/n8n-nodes-faim to registry"
3. Include in issue:
   - Link to npm package: https://www.npmjs.com/package/@faim-group/n8n-nodes-faim
   - GitHub repository URL (if applicable)
   - Brief description (already in README)
   - Confirmation of testing

Example issue body:
```markdown
## Community Node Submission

**Package**: @faim-group/n8n-nodes-faim

**npm Link**: https://www.npmjs.com/package/@faim-group/n8n-nodes-faim

**Description**:
n8n node for FAIM time-series forecasting API. Provides access to Chronos 2.0 large language model for high-quality forecasts with support for point predictions, quantile forecasts, and samples.

**Features**:
- Support for 1D/2D/3D input arrays (automatic normalization)
- Three output types: point, quantiles, samples
- Full type safety with TypeScript strict mode
- 36 unit tests with comprehensive coverage
- Example workflows included

**Verification**:
- ✅ Linting passes
- ✅ All tests pass (36/36)
- ✅ Builds successfully
- ✅ Follows n8n community node standards
```

### Step 7: Version Updates

For future releases, follow semantic versioning:

```bash
# For bug fixes (1.0.0 -> 1.0.1)
npm version patch

# For new features (1.0.0 -> 1.1.0)
npm version minor

# For breaking changes (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish --access public
```

## Troubleshooting

### Error: "You must be logged in to publish"
```bash
npm login
```

### Error: "You do not have permission to publish"
Scoped packages require specific permissions. Check access:
```bash
npm access list packages @faim-group
npm access grant read-only users username @faim-group
```

### Error: "Cannot find module in dist/"
Rebuild the project:
```bash
pnpm run build
```

### Private vs Public Scoped Package
Always use `--access public` for scoped community nodes:
```bash
npm publish --access public
```

## Files Included in npm Package

The npm package includes (defined in package.json `files` field):
- `dist/` - Compiled JavaScript and TypeScript definitions
  - `index.js` / `index.d.ts` - Main entry point
  - `nodes/FAIMForecast/FAIMForecast.node.js` - n8n node
  - `nodes/FAIMForecast/FAIMForecast.credentials.js` - API key credential
  - `nodes/FAIMForecast/faim.png` - Node icon
  - All supporting modules (api/, data/, arrow/, errors/)

## Support & Documentation

- **README**: Comprehensive installation, usage, and examples
- **DEVELOPMENT.md**: Development setup for contributors
- **QUICKSTART.md**: 5-minute getting started guide
- **EXAMPLES.md**: 4 ready-to-import example workflows
- **Tests**: 36 unit tests covering all core functionality

## Post-Submission

After successful publication:

1. ✅ Update GitHub Actions if you have them configured
2. ✅ Announce in FAIM community channels
3. ✅ Monitor npm package statistics and user feedback
4. ✅ Watch for GitHub issues for bug reports

## See Also

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [n8n Community Nodes](https://github.com/n8n-io/n8n-nodes-base)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
