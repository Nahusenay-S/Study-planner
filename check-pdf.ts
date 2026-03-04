import PDFParse from "pdf-parse";
console.log(typeof PDFParse);
try {
    const parser = new PDFParse({});
    console.log("PDFParse is a class");
} catch (e) {
    console.log("PDFParse is not a class:", e.message);
}
