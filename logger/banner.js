// logger/banner.js - BADOL Custom v2.0 - 100% Same Logic + Fixed

const c = require('./color');
const path = require('path');
const fs = require('fs');

function getBanner() {
  let version = '2.0.0-Custom';
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = require(packageJsonPath);
      version = packageJson.version || version;
    }
  } catch {}

  return `
${c.cyan(`
 ██████╗  █████╗ ██████╗  ██████╗ ██╗     
 ██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║     
 ██████╔╝███████║██║  ██║██║   ██║██║     
 ██╔══██╗██╔══██║██║  ██║██║   ██║██║     
 ██████╔╝██║  ██║██████╔╝╚██████╔╝███████╗
 ╚══════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚══════╝`)}

${c.yellow(`
 ████████╗ ██████╗     ██████╗  ██████╗ ████████╗
 ╚══██╔══╝██╔════╝     ██╔══██╗██╔══██╗╚══██╔══╝
    ██║   ██║  ███╗    ██████╔╝██║   ██║   ██║   
    ██║   ██║   ██║    ██╔══██╗██║   ██║   ██║   
    ██║   ╚██████╔╝    ██████╔╝╚██████╔╝   ██║   
    ╚═╝    ╚═════╝     ╚═════╝  ╚═════╝    ╚═╝   `)}

${c.cyan('╔═════════════════════════╗')}
${c.cyan('║')} ${c.bright(c.yellow(' ⚡ BADOL-TG-BOT'))}       ${c.cyan('║')}
${c.cyan('╠═════════════════════════╣')}
${c.cyan('║')} ${c.white('Ver:')} ${c.bright(c.green(`v${version.padEnd(19, ' ')}`))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('Aut:')} ${c.cyan(`Badol`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('Exp:')} ${c.yellow(`5+ Yrs`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('Loc:')} ${c.dim(`Bangladesh`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('TG :')} ${c.blue(`t.me/B4D9L_007`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('Git:')} ${c.dim(`github.com/...`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('║')} ${c.white('Lic:')} ${c.dim(`MIT`.padEnd(19, ' '))} ${c.cyan('║')}
${c.cyan('╚═════════════════════════╝')}
`;
}

function showBanner() {
  console.clear();
  console.log(getBanner());
}

function showCopyright() {
  console.log('\n' + c.cyan('═'.repeat(27)));
  console.log(c.bright(c.yellow('  ⚡ BADOL-TG-BOT Running')));
  console.log(c.cyan('═'.repeat(27)) + '\n');
}

module.exports = { showBanner, getBanner, showCopyright };