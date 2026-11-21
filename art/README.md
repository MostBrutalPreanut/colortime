# Colortime painting prompts

Tests painting styles across fal.ai models.

- `prompts.json`: models, style prompts, subjects, and the layer test.
- `python3 generate.py batch`: every style x subject x model, saved to `out/<run>/` with `sheet.jpg` to compare.
  Narrow it with `--styles vignette --subjects heron,cat --models flux-2-pro`.
- `python3 generate.py layers`: one empty background plus separate pieces on white, combined two ways:
  multiply (the white vanishes, like a transparent card) and a background-removed cut-out.

Needs `FAL_KEY` in the environment, and Pillow (`pip install pillow`).
Rough cost per image: flux-2-pro and seedream-4 about $0.03, nano-banana-pro about $0.15.
