import urllib.request
from bs4 import BeautifulSoup

url = 'http://py4e-data.dr-chuck.net/known_by_Mikaela.html'
position = 18
count = 7

for i in range(count + 1):
    print('Retrieving:', url)
    html = urllib.request.urlopen(url).read()
    soup = BeautifulSoup(html, 'html.parser')
    links = soup.find_all('a')
    url = links[position - 1].get('href')

name = url.split('known_by_')[1].replace('.html', '')
print('\nFinal Answer:', name)
