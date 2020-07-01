## To customize bootstrap do the following:

- If **npm** is <ins>not</ins> installed: `npm i`

- If **bootstrap** is <ins>not</ins> installed: `npm i bootstrap --save`

- If **scss** is <ins>not</ins> installed: `npm i scss -g`

---

Edit the `custom.scss` file and add/change the `!default` variables you want from `/node_modules/bootstrap/scss/_variables.scss`

---

Once you have added/changed all you wanted, do the following command in terminal:
`scss custom.scss bootstrap.css`
This will create/override the `bootstrap.css` file with bootstrap compiled and in one single `.css` file.

All you need to do after this is drag/copy the `bootstrap.css` to your html files directory and add it to the sources. 
- Example: ```<link rel="stylesheet" href="src/css/bootstrap.css">```

---

### If you get this error when doing `scss custom.scss bootstrap.css`: 


```sass : File ...\AppData\Roaming\npm\sass.ps1 cannot be loaded. The file ...\AppData\Roaming\npm\sass.ps1 is not digitally signed. You cannot run this script on the current system.```


#### Solution:

- Go into `PowerShell` as **Administrator** and type the following: `Set-ExecutionPolicy Bypass` and then select 
`[A] Yes to All`, this will enable you to run the sass command later on. 
- You can revert this by typing `Set-ExecutionPolicy Default` and then select `[A] Yes to All`.

