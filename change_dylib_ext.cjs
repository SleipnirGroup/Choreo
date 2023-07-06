const fs = require('fs');

var dllext = process.argv.slice(1)[1];

console.log("Using " + dllext);

// Define the path to the JSON file
const filePath = 'src-tauri/tauri.conf.json';

// Read the JSON file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  // Parse the JSON data
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return;
  }

  // Modify the desired string value
  jsonData.tauri.bundle.resources[0] = dllext;

  // Convert the modified data back to a string
  const modifiedData = JSON.stringify(jsonData, null, 2);

  // Write the modified data back to the file
  fs.writeFile(filePath, modifiedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to the file:', err);
      return;
    }
    console.log('String value modified successfully!');
  });
});
