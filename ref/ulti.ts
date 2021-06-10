export function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

export function iOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
  
export function hexToRGB(code:string):number[]|undefined {
  if (code.length != 6)
    return undefined;
    
  const result = [0, 0, 0];

  for (let i = 0; i < 3; i++) {
    const j = i * 2;
    result[i] = parseInt(code.substring(j, j + 2), 16);
    result[i] /= 255;
  }

  return result;
}

export function sleep(ms:number):Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms)); 
}

export function clamp(value:number, min:number, max:number):number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a:number, b:number, t:number):number {
  return a + (b - a) * t;
}