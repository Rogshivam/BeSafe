Whenever deploying to a new server:
```
sudo cp ~/BeSafe/nginx/besafe.conf /etc/nginx/sites-available/besafe
```
Enable it:
```
sudo ln -s /etc/nginx/sites-available/besafe /etc/nginx/sites-enabled/
```
Remove default nginx site:
```
sudo rm /etc/nginx/sites-enabled/default
```
Reload:
```
sudo nginx -t
sudo systemctl reload nginx
```
This is much better because:

By this infra config is version controlled
teammates can deploy easily
future VPS migration becomes simple
CI/CD becomes easier later
by this we can backup the entire deployment config with git and automate deployment.
