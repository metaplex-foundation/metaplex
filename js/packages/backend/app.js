const express = require('express')
var cors = require('cors')
var app = express()
 
app.use(cors())
const port = 3002
const fs = require('fs')
var bodyParser = require('body-parser');


// Put these statements before you define any routes.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
  
app.post('/update', (req, res) => {
  try {
fs.writeFileSync('../common/src/contexts/meta/metadata.json', JSON.parse(req.body))
res.send(200)
}
catch(err){
  console.log(err)
}
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})  

for (var obj in state){
   // console.log(obj)
    for (var abc in tempCache[obj]){
      try{
        tempCache[obj][abc].info.data = []

      }
      catch(err){

      }
      try{
        tempCache[obj][abc].account.data = []

      }
      catch(err){

      }
    }
    console.log(state[obj])
  }