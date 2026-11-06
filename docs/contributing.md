# Documentation maintenance

`corpus.json` routes CLI implementation and schema changes to the command/API
reference, and initialization changes to its setup guide. Review those claims
against their real callers when changing the selected inputs.

Run the shared Corpus gate against `origin/main`. Update inaccurate prose in the
same PR. If it remains accurate, add a new local input/output byte review with
an explanation and limits in `corpus-content.json`, following
[Corpus's review contract](https://github.com/kontourai/corpus/blob/b127e35a818b532369843731b3c64792baade83e/docs/related-content.md#review-an-unchanged-covering-document).
Use that same reviewed Corpus revision for local checks. A hash match does not
prove that prose is true; do not refresh hashes without inspecting the change.
