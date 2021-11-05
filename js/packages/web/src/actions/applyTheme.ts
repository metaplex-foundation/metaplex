import { StorefrontTheme } from '@oyster/common';
import { Color, Vector3 } from 'three';
const { cbrt } = Math;

const where = <T extends { clone: () => T }>(t: T, by: (t: T) => void) => {
  const ret = t.clone();
  by(ret);
  return ret;
};

// Linear interpolation between a and b by t.
const lerp = (a: number, b: number, t: number) => a + t * (b - a);
const lerpVec = <T extends Vector3>(a: T, b: T, t: number): T =>
  a.clone().addScaledVector(b.clone().sub(a), t);

class Lab extends Vector3 {
  get l(): number {
    return this.x;
  }
  get a(): number {
    return this.y;
  }
  get b(): number {
    return this.z;
  }

  set l(val) {
    this.x = val;
  }
  set a(val) {
    this.y = val;
  }
  set b(val) {
    this.z = val;
  }
}

// https://bottosson.github.io/posts/oklab/
const oklab = (srgb: Color): Lab => {
  const c = srgb.clone().convertSRGBToLinear();

  const l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  const m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  const s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);

  return new Lab(
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  );
};

const unOklab = (c: Lab): Color => {
  const l_ = c.l + 0.3963377774 * c.a + 0.2158037573 * c.b;
  const m_ = c.l - 0.1055613458 * c.a - 0.0638541728 * c.b;
  const s_ = c.l - 0.0894841775 * c.a - 1.291485548 * c.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return new Color(
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ).convertLinearToSRGB();
};

const BLACK = Object.freeze(new Color('black'));
const WHITE = Object.freeze(new Color('white'));
const BLACK_LAB = Object.freeze(oklab(BLACK));
const WHITE_LAB = Object.freeze(oklab(WHITE));

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
const relativeLuma = (lab: Lab) => {
  // TODO: unnecessary conversion
  const { r, g, b } = unOklab(lab).convertSRGBToLinear();

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
const contrastRatio = (a: Lab, b: Lab) => {
  let l1 = relativeLuma(a);
  let l2 = relativeLuma(b);

  if (l2 > l1) [l2, l1] = [l1, l2];

  return (l1 + 0.05) / (l2 + 0.05);
};

/** Whether dark text or light text would work better against a background by the WCAG standard */
const isLight = (clr: Lab) =>
  contrastRatio(BLACK_LAB, clr) > contrastRatio(WHITE_LAB, clr);

/** Generate a color further from the given background color */
const bolder = (clr: Lab, by: number) =>
  where(clr, c => (c.l = lerp(c.l, isLight(c) ? 0 : 1, by)));

/** Generate a color closer to the given background color */
const fainter = (clr: Lab, by: number) =>
  where(clr, c => (c.l = lerp(c.l, isLight(c) ? 1 : 0, by)));

/** Generate a suitable text color from an intended background color */
const textColor = (clr: Lab) =>
  lerpVec(clr, isLight(clr) ? BLACK_LAB : WHITE_LAB, 0.85);

/** Apply the relevant CSS variables for a storefront theme */
export const applyTheme = (
  theme: StorefrontTheme,
  vars: CSSStyleDeclaration,
  head: Node,
) => {
  applyThemeColors(theme.color, vars);
  return applyThemeFonts(theme.font, vars, head);
};

/** Apply the colors from a storefront theme */
const applyThemeColors = (
  { background, primary }: StorefrontTheme['color'],
  vars: CSSStyleDeclaration,
) => {
  const base = Object.freeze(new Color(background));
  const accent = Object.freeze(new Color(primary));

  const baseLab = Object.freeze(oklab(base));
  const accentLab = Object.freeze(oklab(accent));

  const baseBoldLab = bolder(baseLab, 0.1);
  const baseFaintLab = fainter(baseLab, 0.1);
  const borderLab = bolder(baseLab, 0.2);

  const accentBoldLab = bolder(accentLab, 0.1);
  const accentFaintLab = fainter(accentLab, 0.1);

  const textLab = textColor(baseBoldLab);
  const textFaintLab = lerpVec(textLab, baseLab, 0.4);
  const textAccentLab = textColor(accentLab);

  vars.setProperty('--color-base', base.getStyle());
  vars.setProperty('--color-base-bold', unOklab(baseBoldLab).getStyle());
  vars.setProperty('--color-base-faint', unOklab(baseFaintLab).getStyle());

  vars.setProperty('--color-border', unOklab(borderLab).getStyle());

  vars.setProperty('--color-accent', accent.getStyle());
  vars.setProperty('--color-accent-bold', unOklab(accentBoldLab).getStyle());
  vars.setProperty('--color-accent-faint', unOklab(accentFaintLab).getStyle());

  vars.setProperty('--color-text', unOklab(textLab).getStyle());
  vars.setProperty('--color-text-faint', unOklab(textFaintLab).getStyle());
  vars.setProperty('--color-text-accent', unOklab(textAccentLab).getStyle());
};

const FONTS_ID = '--holaplex-theme-fonts';

const FONT_STACKS: Record<string, string[] | undefined> = {
  Merriweather: ['serif'],
  'Playfair Display': ['serif'],
  'Noto Serif': ['serif'],
  Domine: ['serif'],
};

const fontStack = (font: string) => [
  font,
  ...(FONT_STACKS[font] ?? ['sans-serif']),
];

const formatFontStack = (stack: string[]) =>
  stack.map(s => (/\s/.test(s) ? `'${s.replace(/'/g, "\\'")}'` : s)).join(', ');

const applyThemeFonts = (
  { title, text }: StorefrontTheme['font'],
  vars: CSSStyleDeclaration,
  head: Node,
) => {
  const titleStack = fontStack(title);
  const textStack = fontStack(text);

  vars.setProperty('--family-title', formatFontStack(titleStack));
  vars.setProperty('--family-text', formatFontStack(textStack));

  const link =
    (document.getElementById(FONTS_ID) as HTMLLinkElement) ??
    document.createElement('link');

  const fontIds = [title, text]
    .map(s => s.replace(/\s+/g, '+'))
    .join('&family=');

  link.id = FONTS_ID;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = `https://fonts.googleapis.com/css2?family=${fontIds}&display=swap`;

  head.appendChild(link);

  return () => link.remove();
};
