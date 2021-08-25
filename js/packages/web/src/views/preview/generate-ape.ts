// import './merge-images';
import mergeImages from 'merge-images-v2';

export let clanList = [
  'Harambe',
  'Digit',
  'Koko',
  'Gargantua',
  'Shabani',
  'Titus',
  'Binti Jua',
  'Bobo',
  'Colo',
  'Michael',
];
export let signList = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Pisces',
  'Aquarius',
];
export let backgroundList = [
  'Bamboo Green',
  'Banana Yellow',
  'Belly Pink',
  'Royal Purple',
  'Blood Red',
  'Beach Gradient',
  'Clouds',
  'Stars',
  'Solana Gradient',
];
export let bodyList = [
  'Black',
  'Grey',
  'Brown',
  'Blonde',
  'Albino',
  'Green',
  'Silver',
  'Gold',
  'Ice',
];

export let eyesList = [
  'Brown',
  'Green',
  'Blue',
  'Blue (Winking)',
  'Glasses',
  'Sunglasses',
  'Dead Eyes',
  'Gems',
  'Lit Pythons',
  'Insect Eyes',
  'Heart Eyes',
  'Psychedelic Eyes',
  'Hypno Eyes',
  'Alien',
];

export let clothesList = [
  'None',
  'White T-Shirt',
  'Football Jersey',
  'String Vest',
  'Soccer Jersey',
  'Prom Dress',
  'Blue Tuxedo',
  'Bra',
  'Plaid Shirt',
  'Solana T-Shirt',
  'Corset',
  'Hoodie',
  'Cape',
  'King Robe',
];
export let mouthList = [
  'None',
  'Teeth',
  'Red Lipstick',
  'Tongue Out',
  'Black Lipstick',
  'Banana',
  'Rose',
  'Gold Teeth',
  'Bubble Pipe',
];
export let headList = [
  'None',
  'Short Hair',
  'Long Straight Hair',
  'Long Wavy Brown',
  'Blonde Bob',
  'Beanie',
  'Balding',
  'Fauxhawk',
  'Afro',
  'Pink Bob',
  'Long Straight Blue',
  'Mohawk',
  'Visor',
  'Top Hat',
];
export let accessList = [
  'None',
  'Nose Ring Silver',
  'Septum Ring Gold',
  'Nose Ring Gold',
  'Septum Ring Silver',
  'Earring Gold',
];
export async function generateApe({
  n1 = Math.random(),
  s1 = Math.random(),
  bg1 = Math.random(),
  b1 = Math.random(),
  e1 = Math.random(),
  c1 = Math.random(),
  m1 = Math.random(),
  h1 = Math.random(),
  a1 = Math.random(),
}: {
  n1?: any;
  s1?: any;
  bg1?: any;
  b1?: any;
  e1?: any;
  c1?: any;
  m1?: any;
  h1?: any;
  a1?: any;
}) {
  let clan, sign, body, mouth, head, eyes, clothes, background, access;

  if (n1 < 0.1) {
    clan = clanList[0];
  } else if (n1 >= 0.1 && n1 < 0.2) {
    clan = clanList[1];
  } else if (n1 >= 0.2 && n1 < 0.3) {
    clan = clanList[2];
  } else if (n1 >= 0.3 && n1 < 0.4) {
    clan = clanList[3];
  } else if (n1 >= 0.4 && n1 < 0.5) {
    clan = clanList[4];
  } else if (n1 >= 0.5 && n1 < 0.6) {
    clan = clanList[5];
  } else if (n1 >= 0.6 && n1 < 0.7) {
    clan = clanList[6];
  } else if (n1 >= 0.7 && n1 < 0.8) {
    clan = clanList[7];
  } else if (n1 >= 0.8 && n1 < 0.9) {
    clan = clanList[8];
  } else if (n1 >= 0.9 && n1 <= 1.0) {
    clan = clanList[9];
  }
  //Sign Selector
  if (s1 < 0.1) {
    sign = signList[0];
  } else if (s1 >= 0.1 && s1 < 0.2) {
    sign = signList[1];
  } else if (s1 >= 0.2 && s1 < 0.3) {
    sign = signList[2];
  } else if (s1 >= 0.3 && s1 < 0.4) {
    sign = signList[3];
  } else if (s1 >= 0.4 && s1 < 0.5) {
    sign = signList[4];
  } else if (s1 >= 0.5 && s1 < 0.6) {
    sign = signList[5];
  } else if (s1 >= 0.6 && s1 < 0.7) {
    sign = signList[6];
  } else if (s1 >= 0.7 && s1 < 0.8) {
    sign = signList[7];
  } else if (s1 >= 0.8 && s1 < 0.9) {
    sign = signList[8];
  } else if (s1 >= 0.9 && s1 <= 1.0) {
    sign = signList[9];
  }

  if (bg1 < 0.301) {
    background = backgroundList[0];
  } else if (bg1 >= 0.301 && bg1 < 0.601) {
    background = backgroundList[1];
  } else if (bg1 >= 0.601 && bg1 < 0.751) {
    background = backgroundList[2];
  } else if (bg1 >= 0.751 && bg1 < 0.902) {
    background = backgroundList[3];
  } else if (bg1 >= 0.902 && bg1 < 0.939) {
    background = backgroundList[4];
  } else if (bg1 >= 0.939 && bg1 < 0.976) {
    background = backgroundList[5];
  } else if (bg1 >= 0.976 && bg1 < 0.987) {
    background = backgroundList[6];
  } else if (bg1 >= 0.987 && bg1 < 0.997) {
    background = backgroundList[7];
  } else if (bg1 >= 0.998 && bg1 <= 1.0) {
    background = backgroundList[8];
  }
  //Body Color Selector
  if (b1 < 0.301) {
    body = bodyList[0];
  } else if (b1 >= 0.301 && b1 < 0.601) {
    body = bodyList[1];
  } else if (b1 >= 0.601 && b1 < 0.751) {
    body = bodyList[2];
  } else if (b1 >= 0.751 && b1 < 0.902) {
    body = bodyList[3];
  } else if (b1 >= 0.902 && b1 < 0.939) {
    body = bodyList[4];
  } else if (b1 >= 0.939 && b1 < 0.976) {
    body = bodyList[5];
  } else if (b1 >= 0.976 && b1 < 0.987) {
    body = bodyList[6];
  } else if (b1 >= 0.987 && b1 < 0.997) {
    body = bodyList[7];
  } else if (b1 >= 0.998 && b1 <= 1.0) {
    body = bodyList[8];
  }
  //Eyes Selector
  if (e1 < 0.297) {
    eyes = eyesList[0];
  } else if (e1 >= 0.297 && e1 < 0.447) {
    eyes = eyesList[1];
  } else if (e1 >= 0.447 && e1 < 0.597) {
    eyes = eyesList[2];
  } else if (e1 >= 0.597 && e1 < 0.747) {
    eyes = eyesList[3];
  } else if (e1 >= 0.747 && e1 < 0.817) {
    eyes = eyesList[4];
  } else if (e1 >= 0.817 && e1 < 0.854) {
    eyes = eyesList[5];
  } else if (e1 >= 0.854 && e1 < 0.89) {
    eyes = eyesList[6];
  } else if (e1 >= 0.89 && e1 < 0.927) {
    eyes = eyesList[7];
  } else if (e1 >= 0.927 && e1 < 0.964) {
    eyes = eyesList[8];
  } else if (e1 >= 0.964 && e1 < 0.974) {
    eyes = eyesList[9];
  } else if (e1 >= 0.974 && e1 < 0.984) {
    eyes = eyesList[10];
  } else if (e1 >= 0.984 && e1 < 0.994) {
    eyes = eyesList[11];
  } else if (e1 >= 0.994 && e1 < 0.997) {
    eyes = eyesList[12];
  } else if (e1 >= 0.997 && e1 <= 1.0) {
    eyes = eyesList[13];
  }
  //Clothes Selector
  if (c1 < 0.297) {
    clothes = clothesList[0];
  } else if (c1 >= 0.297 && c1 < 0.447) {
    clothes = clothesList[1];
  } else if (c1 >= 0.447 && c1 < 0.597) {
    clothes = clothesList[2];
  } else if (c1 >= 0.597 && c1 < 0.747) {
    clothes = clothesList[3];
  } else if (c1 >= 0.747 && c1 < 0.817) {
    clothes = clothesList[4];
  } else if (c1 >= 0.817 && c1 < 0.854) {
    clothes = clothesList[5];
  } else if (c1 >= 0.854 && c1 < 0.89) {
    clothes = clothesList[6];
  } else if (c1 >= 0.89 && c1 < 0.927) {
    clothes = clothesList[7];
  } else if (c1 >= 0.927 && c1 < 0.964) {
    clothes = clothesList[8];
  } else if (c1 >= 0.964 && c1 < 0.974) {
    clothes = clothesList[9];
  } else if (c1 >= 0.974 && c1 < 0.984) {
    clothes = clothesList[10];
  } else if (c1 >= 0.984 && c1 < 0.994) {
    clothes = clothesList[11];
  } else if (c1 >= 0.994 && c1 < 0.997) {
    clothes = clothesList[12];
  } else if (c1 >= 0.997 && c1 <= 1.0) {
    clothes = clothesList[13];
  }
  //Mouth Color
  if (m1 < 0.3) {
    mouth = mouthList[0];
  } else if (m1 >= 0.3 && m1 < 0.6) {
    mouth = mouthList[1];
  } else if (m1 >= 0.6 && m1 < 0.75) {
    mouth = mouthList[2];
  } else if (m1 >= 0.75 && m1 < 0.9) {
    mouth = mouthList[3];
  } else if (m1 >= 0.9 && m1 < 0.9376) {
    mouth = mouthList[4];
  } else if (m1 >= 0.9376 && m1 < 0.9748) {
    mouth = mouthList[5];
  } else if (m1 >= 0.9748 && m1 < 0.9848) {
    mouth = mouthList[6];
  } else if (m1 >= 0.9848 && m1 < 0.9948) {
    mouth = mouthList[7];
  } else if (m1 >= 0.9948 && m1 <= 1.0) {
    mouth = mouthList[8];
  }
  //Head/Hair Selector
  if (h1 < 0.297) {
    head = headList[0];
  } else if (h1 >= 0.297 && h1 < 0.447) {
    head = headList[1];
  } else if (h1 >= 0.447 && h1 < 0.597) {
    head = headList[2];
  } else if (h1 >= 0.597 && h1 < 0.747) {
    head = headList[3];
  } else if (h1 >= 0.747 && h1 < 0.817) {
    head = headList[4];
  } else if (h1 >= 0.817 && h1 < 0.854) {
    head = headList[5];
  } else if (h1 >= 0.854 && h1 < 0.89) {
    head = headList[6];
  } else if (h1 >= 0.89 && h1 < 0.927) {
    head = headList[7];
  } else if (h1 >= 0.927 && h1 < 0.964) {
    head = headList[8];
  } else if (h1 >= 0.964 && h1 < 0.974) {
    head = headList[9];
  } else if (h1 >= 0.974 && h1 < 0.984) {
    head = headList[10];
  } else if (h1 >= 0.984 && h1 < 0.994) {
    head = headList[11];
  } else if (h1 >= 0.994 && h1 < 0.997) {
    head = headList[12];
  } else if (h1 >= 0.997 && h1 <= 1.0) {
    head = headList[13];
  }
  //Accessories Selector
  if (a1 < 0.4656) {
    access = accessList[0];
  } else if (a1 >= 0.4656 && a1 < 0.7656) {
    access = accessList[1];
  } else if (a1 >= 0.7656 && a1 < 0.9156) {
    access = accessList[2];
  } else if (a1 >= 0.9156 && a1 < 0.9528) {
    access = accessList[3];
  } else if (a1 >= 0.9528 && a1 < 0.99) {
    access = accessList[4];
  } else if (a1 >= 0.99 && a1 <= 1.0) {
    access = accessList[5];
  }

  const loadImg = (url: string) => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = 'Anonymous';
      img.onload = (e: Event) => {
        var c = document.createElement('canvas');
        c.width = 1000;
        c.height = 1000;
        var ctx = c.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(c.toDataURL());
      };
    });
  };

  debugger

  return await mergeImages([
    {
      src: await loadImg(
        `/background/${background
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/body/${body
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/eyes/${eyes
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/clothes/${clothes
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/hair_hats/${head
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/mouth/${mouth
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(
        `/accessories/${access
          ?.toLowerCase()
          .replaceAll(' ', '-')
          .replaceAll('(', '')
          .replaceAll(')', '')}.png`,
      ),
      width: 1000,
      height: 1000,
    },
    {
      src: await loadImg(`/watermark.png`),
      width: 1000,
      height: 1000,
    },
  ]);
}
