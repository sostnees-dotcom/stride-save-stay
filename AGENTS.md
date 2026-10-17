<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- LOVABLE:END -->

## Storage

- Monthly progress is stored per month in localStorage under `monthlyGoalTracker:<YYYY-MM>` (only the completed days), while the shared goal and daily amount live in `monthlyGoalSettings`. Keep it that way so switching months never leaks another month's deposits; the older single-key `monthlyGoalTracker` entry is read once as a legacy fallback for the current month.

- Signed-in progress and settings use account-scoped Cloud rows as the source of truth; legacy browser keys are imported only by their first recorded owner to prevent cross-account deposits.
- Calendar and settings writes must await Cloud confirmation, serialize edits, and surface failures instead of claiming unsaved changes are saved.
- The root owns the identity-transition auth subscription; protected UI uses the integration-managed route gate to keep session handling consistent.
