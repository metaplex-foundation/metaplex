export interface Converter {
  to: (param: any) => any;
  from: (param: any) => any;
}

export class ConverterSet extends Map<string, Converter> {
  applyConversion(obj: any) {
    return this.applyConversionRec(obj, "");
  }

  revertConversion(obj: any) {
    return this.revertConversionRec(obj, "");
  }

  private applyConversionRec(obj: any, currentPath: string) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.applyConversionRec(item, currentPath);
      }
      return;
    }

    for (const prop in obj) {
      if (typeof obj[prop] == "function") {
        continue;
      }

      if (!obj.hasOwnProperty(prop)) {
        continue;
      }

      const value = obj[prop];
      const path = currentPath.length == 0 ? prop : currentPath + "." + prop;
      if (this.has(path)) {
        const converter = this.get(path);
        obj[prop] = converter?.to(value);
      } else if (value instanceof Object || Array.isArray(value)) {
        this.applyConversionRec(value, path);
      }
    }
  }

  private revertConversionRec(obj: any, currentPath: string) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.revertConversionRec(item, currentPath);
      }
      return;
    }

    for (const prop in obj) {
      if (typeof obj[prop] == "function") {
        continue;
      }

      if (!obj.hasOwnProperty(prop)) {
        continue;
      }

      const value = obj[prop];
      const path = currentPath.length == 0 ? prop : currentPath + "." + prop;

      if (this.has(path)) {
        const converter = this.get(path);
        obj[prop] = converter?.from(value);
      } else if (value instanceof Object || Array.isArray(value)) {
        this.revertConversionRec(value, path);
      }
    }
  }
}
