import { PDFParse } from "pdf-parse";
import fs from "fs";

async function test() {
    try {
        console.log("PDFParse:", PDFParse);
        // Let's try to see the constructor
        const parser = new PDFParse();
        console.log("Parser instance created");
    } catch (e) {
        console.log("Error:", e.message);
    }
}
test();
