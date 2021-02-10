node ./update-version.js
git add .
git commit -m "$1"
git push origin master
git push heroku master