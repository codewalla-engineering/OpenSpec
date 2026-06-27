# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into OpenSpec CLI. A new analytics client was added to `src/telemetry/index.ts`, driven entirely by `POSTHOG_API_KEY` and `POSTHOG_HOST` environment variables, alongside the existing anonymous telemetry client. Thirteen events covering the full CLI lifecycle — change management, validation, store and workset operations, configuration changes, and user feedback — were instrumented across six command files. Exception capture was also added to the new change, store setup/register/remove, and workset remove flows.

| Event | Description | File |
|---|---|---|
| `change_created` | User created a new change scaffold via the new change command. | `src/commands/workflow/new-change.ts` |
| `change_validated` | User validated a single change and received a pass or fail result. | `src/commands/validate.ts` |
| `spec_validated` | User validated a single spec and received a pass or fail result. | `src/commands/validate.ts` |
| `bulk_validation_run` | User ran bulk validation across multiple changes and/or specs. | `src/commands/validate.ts` |
| `store_setup` | User created and registered a new local OpenSpec store. | `src/commands/store.ts` |
| `store_registered` | User registered an existing local directory as an OpenSpec store. | `src/commands/store.ts` |
| `store_removed` | User deleted a store registration and its local folder. | `src/commands/store.ts` |
| `workset_created` | User composed and saved a new named workset of project folders. | `src/commands/workset.ts` |
| `workset_opened` | User opened a saved workset in their chosen editor or agent tool. | `src/commands/workset.ts` |
| `workset_removed` | User deleted a saved workset (member folders were not touched). | `src/commands/workset.ts` |
| `config_profile_changed` | User updated their global OpenSpec delivery and workflow profile settings. | `src/commands/config.ts` |
| `config_value_set` | User set a specific global configuration key to a new value. | `src/commands/config.ts` |
| `feedback_submitted` | User submitted feedback that was successfully filed as a GitHub issue. | `src/commands/feedback.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/488557/dashboard/1768782)
- [Change creation over time](https://us.posthog.com/project/488557/insights/s8DCI2oV)
- [CLI feature adoption](https://us.posthog.com/project/488557/insights/dFUzS5nM)
- [Validation pass rate (changes)](https://us.posthog.com/project/488557/insights/Z3Jo3VoU)
- [Store and workset lifecycle](https://us.posthog.com/project/488557/insights/D2cEtYfX)
- [Active users by week](https://us.posthog.com/project/488557/insights/AFhPI2U6)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
