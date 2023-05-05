const fs = require('fs');

const writeFile = (filePath, content) => {
    fs.writeFile(filePath, content,()=>{});
}

module.exports = {writeFile}