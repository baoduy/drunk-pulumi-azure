import { readFileSync, writeFileSync } from 'fs';

// Function to replace text in a file
const replaceTextInFile = (filePath: string, searchText: string, replacementText: string) => {
    // Read the file content
    const fileContent = readFileSync(filePath, 'utf-8');

    // Replace the text
    const updatedContent = fileContent.replace(new RegExp(searchText, 'g'), replacementText);

    // Write the updated content back to the file
    writeFileSync(filePath, updatedContent, 'utf-8');

    console.log(`Text replaced successfully in ${filePath}`);
};

// Example usage
const filePath = './node_modules/openpgp/openpgp.d.ts'; // Path to your file
const searchText = 'NodeStream as GenericNodeStream'; // Text to be replaced
const replacementText = 'NodeWebStream as GenericNodeStream'; // Text to replace with

replaceTextInFile(filePath, searchText, replacementText);