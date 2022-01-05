#!/bin/bash

git checkout gh-pages
rsync -r build/web/* ../
git add ..
git commit -a -m 'Updates'
git push origin gh-pages
