const fs = require('fs');

const current = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const old = fs.readFileSync('page_base.tsx', 'utf16le'); // PowerShell `>` outputs utf16le

const matchStr = "setActiveTab('map')";

const cutCurrent = current.indexOf(matchStr);
const cutOld = old.indexOf(matchStr);

if (cutCurrent !== -1 && cutOld !== -1) {
    fs.writeFileSync('app/dashboard/page.tsx', current.slice(0, cutCurrent) + old.slice(cutOld));
    console.log('Fixed');
} else {
    console.log('Not found', { cutCurrent, cutOld });
}
