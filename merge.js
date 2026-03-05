const cp = require('child_process');
const fs = require('fs');

const half1Buf = cp.execSync('git show 43c666f:app/dashboard/page.tsx', { encoding: 'buffer' });
const half1 = half1Buf.toString('utf8');

const half2Buf = cp.execSync('git show 95f71ef:app/dashboard/page.tsx', { encoding: 'buffer' });
const half2 = half2Buf.toString('utf8');

const cutStr = "setActiveTab('map')} className={`px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'map' ? 'text-[";

const cutIndex1 = half1.indexOf("setActiveTab('map')}");
const cutIndex2 = half2.indexOf("setActiveTab('map')}");

if (cutIndex1 !== -1 && cutIndex2 !== -1) {
    // Pegar toda a parte 1 até a abertura do className errado
    const fixTop = half1.slice(0, cutIndex1);
    const fixBottom = half2.slice(cutIndex2);

    fs.writeFileSync('C:\\VOXGEO\\app\\dashboard\\page.tsx', fixTop + fixBottom, 'utf8');
    console.log("Success!!!");
} else {
    console.log("Failure", cutIndex1, cutIndex2);
}
