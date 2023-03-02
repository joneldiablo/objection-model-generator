yarn build
node ./update-version.js
git add .
git commit -m "$1"
git push origin --all
npm publish