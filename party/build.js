const Path = require('path')
const debug = require('debug')('gui.build')

const Pkg = require('../package.json')
const GuiService = require('./gui-service')

async function main(){
  const service = new GuiService({ name: Pkg.name, version: Pkg.version })


  const build = await service.compile(Path.join(__dirname,'../dataparty'), true)

  debug('compiled')
}

main().catch(err=>{
  console.error('CRASH')
  console.error(err)
})