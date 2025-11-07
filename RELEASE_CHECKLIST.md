# Release Checklist

Use this checklist to prepare the FAIM n8n node for public release.

## Phase 1: Testing & Validation (Days 1-3)

### Unit Tests
- [ ] Write tests for `ShapeConverter` (1D, 2D, 3D, edge cases)
- [ ] Write tests for `RequestBuilder` (model params, validation)
- [ ] Write tests for `ErrorHandler` (error mapping, messages)
- [ ] Write tests for `ForecastClient` (retry logic, timeouts)
- [ ] Achieve 80%+ code coverage
- [ ] Run: `pnpm run test:coverage`

### Integration Tests
- [ ] Test with mock API responses
- [ ] Test retry logic with simulated failures
- [ ] Test all 3 models (Chronos2, FlowState, TiRex)
- [ ] Test batch processing
- [ ] Test error scenarios

### Manual Testing
- [ ] Build project: `pnpm run build`
- [ ] Test with actual n8n instance
- [ ] Import example workflows
- [ ] Execute each workflow successfully
- [ ] Verify costs are displayed correctly
- [ ] Test with different input formats (1D, 2D, 3D)
- [ ] Test error cases (invalid API key, timeout, etc.)

### Code Quality
- [ ] Run linter: `pnpm run lint`
- [ ] Fix all issues: `pnpm run lint:fix`
- [ ] Check types: `pnpm exec tsc --noEmit`
- [ ] No warnings in build output

## Phase 2: Documentation & Examples (Days 2-3)

### Complete Documentation
- [x] README.md (installation, quick start, API reference)
- [x] QUICKSTART.md (5-minute setup)
- [x] EXAMPLES.md (4 workflows with explanations)
- [x] DEVELOPMENT.md (contributing guide)
- [ ] CHANGELOG.md (version history)
  ```markdown
  # Changelog

  ## 1.0.0 (2024-11-06)
  - Initial release
  - Support for Chronos2, FlowState, TiRex models
  - Batch processing
  - Comprehensive error handling
  - 4 example workflows
  ```

### Update README
- [x] Installation instructions
- [x] Quick start section
- [x] Input format examples (1D, 2D, 3D)
- [x] Model descriptions with parameters
- [x] Output format explanation
- [x] Error handling guide
- [x] Performance tips
- [x] Security section
- [ ] Link to GitHub repository
- [ ] Link to n8n documentation

### Add GitHub Assets
- [ ] Create `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] Create `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] Create `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Add `CONTRIBUTING.md` (contributing guide)
- [ ] Add `CODE_OF_CONDUCT.md`
- [ ] Add `LICENSE` file (MIT)

### Verify Examples
- [ ] All 4 example workflows run successfully
- [ ] Example data produces expected results
- [ ] Workflows can be imported without errors

## Phase 3: Repository & Publishing Setup (Day 4)

### GitHub Repository
- [ ] Create repository: `faim-group/n8n-nodes-faim`
- [ ] Add topics: `n8n`, `faim`, `forecast`, `time-series`
- [ ] Write repository description
- [ ] Add GitHub badges (npm, license, GitHub)
- [ ] Enable GitHub Actions
- [ ] Configure branch protection for `main`:
  - Require pull request reviews (1 minimum)
  - Require status checks to pass
  - Require branches to be up to date

### npm Setup
- [ ] Create npm organization: `@faim-group`
- [ ] Verify package name: `@faim-group/n8n-nodes-faim`
- [ ] Prepare npm credentials
- [ ] Create `.npmrc` (if needed)
- [ ] Test local publish (dry run):
  ```bash
  pnpm publish --dry-run
  ```

### CI/CD Configuration
- [ ] Add `NPM_TOKEN` secret to GitHub Actions
- [ ] Verify workflow triggers on push to `main`
- [ ] Test workflow locally (if possible)
- [ ] Monitor first automated publish

### Package.json Verification
- [x] Name: `@faim-group/n8n-nodes-faim`
- [x] Version: `1.0.0`
- [x] Description: Accurate
- [x] Keywords: Relevant (n8n, faim, forecast, etc.)
- [x] Author: `FAIM Team`
- [x] License: `MIT`
- [x] Repository URL: (add before publishing)
- [x] Bug URL: (add before publishing)
- [x] Homepage: (add before publishing)
- [ ] Add repository field:
  ```json
  "repository": {
    "type": "git",
    "url": "https://github.com/faim-group/n8n-nodes-faim"
  }
  ```

## Phase 4: Pre-Release (Day 4)

### Final Checks
- [ ] All tests passing: `pnpm test`
- [ ] Build succeeds: `pnpm run build`
- [ ] No linting errors: `pnpm run lint`
- [ ] Documentation complete and accurate
- [ ] Example workflows tested
- [ ] Git repository initialized and committed

### Version & Release Notes
- [ ] Bump version in `package.json` (if not 1.0.0)
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release draft with notes
- [ ] Tag format: `v1.0.0`

### Security Review
- [ ] No hardcoded secrets or keys
- [ ] No test API keys in code
- [ ] Dependencies checked for vulnerabilities:
  ```bash
  npm audit
  ```
- [ ] License compliance verified (MIT compatible dependencies)

### Final Manual Test
- [ ] Install from local tarball:
  ```bash
  pnpm pack
  npm install ./faim-group-n8n-nodes-faim-1.0.0.tgz
  ```
- [ ] Load in test n8n instance
- [ ] Run example workflows
- [ ] Verify all features work

## Phase 5: Release & Announcement (Day 5)

### Publishing
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Push to main branch and tag:
  ```bash
  git push origin main --follow-tags
  ```
- [ ] Monitor GitHub Actions for successful publish
- [ ] Verify package on npm registry

### Post-Release
- [ ] Publish GitHub release with notes
- [ ] Create announcement on:
  - [ ] n8n community forum
  - [ ] Reddit (r/n8n or automation subreddits)
  - [ ] Product Hunt (optional)
  - [ ] Twitter/social media
  - [ ] FAIM blog/newsletter

### n8n Registry
- [ ] Register with n8n community node registry
- [ ] Provide node details and icon
- [ ] Wait for approval

### Community Building
- [ ] Monitor GitHub issues and discussions
- [ ] Respond to initial questions/feedback
- [ ] Create Twitter thread highlighting features
- [ ] Engage with community questions

## Phase 6: Monitoring & Maintenance (Ongoing)

### Post-Launch
- [ ] Monitor npm download statistics
- [ ] Track GitHub issues and PRs
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Plan feature requests for v1.1.0

### Metrics to Track
- NPM downloads per day
- GitHub stars
- Issues/bug reports
- User feedback and suggestions
- Integration requests

### Next Versions
- [ ] v1.0.1: Bug fixes (if needed)
- [ ] v1.1.0: Features from feedback
- [ ] Add Zstd decompression support
- [ ] Add more example workflows
- [ ] Performance optimizations

---

## Quick Command Reference

```bash
# Testing
pnpm run lint
pnpm run build
pnpm run test
pnpm run test:coverage

# Publishing (automated via GitHub Actions)
# Manual publish (if needed):
# pnpm publish --access public

# Git workflow
git tag v1.0.0
git push origin main --follow-tags

# Pack for testing
pnpm pack

# Verify types
pnpm exec tsc --noEmit
```

## Estimated Timeline

- **Days 1-3**: Testing and validation
- **Days 2-3**: Documentation and examples
- **Day 4**: Repository setup and publishing configuration
- **Day 5**: Release and announcement

**Total**: ~5 days from code freeze to public release

## Success Criteria

✅ **Code Quality**
- 80%+ test coverage
- Zero linting errors
- TypeScript strict mode passes
- All example workflows execute successfully

✅ **Documentation**
- Comprehensive (> 1000 lines)
- Clear and accurate
- Multiple examples
- Troubleshooting guides

✅ **Release**
- Published on npm
- GitHub repository accessible
- n8n registry approved (or submitted)
- Community announcement made

✅ **Community**
- Issues/PRs monitored
- Community responses timely
- Feedback collected for v1.1.0

---

**Remember**: Quality over speed. Better to ship perfectly once than rush and fix bugs later! 🚀