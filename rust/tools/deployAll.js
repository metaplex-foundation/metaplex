import {extname, join} from 'path';
import {readdir} from 'fs';
import {spawn} from 'child_process';

const cwd = process.cwd()
const soPath = join(cwd, "target", "deploy")
readdir(soPath, (err, files) => {
  if (!!err) {
    console.error(err)
    process.exit(1)
  }

  const bpfBins = files.filter(f => extname(f) === ".so")
  bpfBins.forEach((bfile) => {
    const bin = join(soPath, bfile)
    const proc = spawn('solana', ['deploy', bin])
    proc.stdout.on('data', d => console.log(d.toString()))
    proc.stderr.on('data', d => console.error(d.toString()))
    proc.on('close', (code) => {
      if (code !== 0) {
        console.log(`Deployment Failed: ${bin}, exit code ${code}\n`)
        return
      }
      console.log(`Deployment Complete: ${bin}\n`)
    })
  })
});
