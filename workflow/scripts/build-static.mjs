import fs from 'node:fs/promises'

const jsonContent = await fs.readFile(process.argv[2])
fs.writeFile(process.argv[3], "export " + jsonContent)
