import { StorefrontTheme } from '@oyster/common';
import { Color, Vector3 } from 'three';
const { cbrt } = Math;

const where = <T extends { clone: () => T }>(t: T, by: (t: T) => void) => {
  const ret = t.clone();
  by(ret);
  return ret;
};

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

const isLight = (clr: Lab) =>
  clr.distanceTo(BLACK_LAB) > clr.distanceTo(WHITE_LAB);

const bolder = (clr: Lab, by: number) =>
  where(clr, c => (c.l += isLight(c) ? -by : by));
const fainter = (clr: Lab, by: number) =>
  where(clr, c => (c.l += isLight(c) ? by : -by));

export const applyTheme = (
  theme: StorefrontTheme,
  output: CSSStyleDeclaration,
) => {
  const base = new Color(theme.color.background);
  const accent = new Color(theme.color.primary);

  const baseLab = oklab(base);
  const accentLab = oklab(accent);

  const baseText = isLight(baseLab) ? BLACK : WHITE;
  // const baseTextLab = isLight(baseLab) ? BLACK_LAB : WHITE_LAB;

  const accentText = isLight(accentLab) ? BLACK : WHITE;

  output.setProperty('--color-base', base.getStyle());
  output.setProperty(
    '--color-base-bold',
    unOklab(bolder(baseLab, 0.1)).getStyle(),
  );
  output.setProperty(
    '--color-base-faint',
    unOklab(fainter(baseLab, 0.1)).getStyle(),
  );

  output.setProperty(
    '--color-border',
    unOklab(bolder(baseLab, 0.2)).getStyle(),
  );

  output.setProperty('--color-accent', accent.getStyle());
  output.setProperty(
    '--color-accent-bold',
    unOklab(bolder(accentLab, 0.1)).getStyle(),
  );
  output.setProperty(
    '--color-accent-faint',
    unOklab(fainter(accentLab, 0.1)).getStyle(),
  );

  output.setProperty('--color-text', baseText.getStyle());
  output.setProperty('--color-text-accent', accentText.getStyle());
};
