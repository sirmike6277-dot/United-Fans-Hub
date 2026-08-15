declare module "aes-js" {
  const aesjs: {
    ModeOfOperation: {
      ctr: new (key: Uint8Array, counter: unknown) => {
        encrypt(bytes: Uint8Array): Uint8Array;
        decrypt(bytes: Uint8Array): Uint8Array;
      };
    };
    Counter: new (value: number) => unknown;
    utils: {
      utf8: { toBytes(text: string): Uint8Array; fromBytes(bytes: Uint8Array): string };
      hex: { toBytes(hex: string): Uint8Array; fromBytes(bytes: Uint8Array): string };
    };
  };
  export = aesjs;
}
