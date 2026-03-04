import { PDFParse } from "pdf-parse";
import fs from "fs";
import path from "path";

async function testPdf() {
    try {
        const filePath = "c:/Users/SW/Documents/Study PD/Study-planner/uploads/resources/resource - 2 - 1772550128481.pdf";
        if (!fs.existsSync(filePath)) {
            console.error("File not found:", filePath);
            return;
        }

        const dataBuffer = fs.readFileSync(filePath);
        console.log("PDF size:", dataBuffer.length, "bytes");

        // The v2.x version seems to use this pattern:
        const parser = new PDFParse({ data: dataBuffer, verbosity: 0 });
        const result = await parser.getText();

        console.log("Parsed result keys:", Object.keys(result));

        if (result && result.text) {
            console.log("Success! Extracted characters:", result.text.length);
            console.log("Sample text:", result.text.substring(0, 500));
        } else {
            console.log("No text extracted. Full result:", result);
        }
    } catch (e) {
        console.error("Error during PDF parsing:", e.message);
        console.error(e.stack);
    }
}

testPdf();
