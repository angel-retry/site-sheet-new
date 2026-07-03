declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    vfs: Record<string, unknown>;
    fonts: Record<string, unknown>;
    createPdf: (docDefinition: Record<string, unknown>) => {
      download: (fileName: string) => void;
      open: () => void;
    };
  };

  export default pdfMake;
}

declare module "*.js" {
  const value: any;
  export default value;
}

declare module "../../../../../public/fonts/vfs_fonts.js" {
  const vfsFonts: any;
  export default vfsFonts;
}
