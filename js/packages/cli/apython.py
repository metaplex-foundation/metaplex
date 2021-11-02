with open('cmlamports.csv', 'r') as f:
	lamports = f.read().split('\n')
t = 0
c = 0
for l in lamports:
	try:
		t = t + float(l)
		c = c + 1
	except:
		abc=123
print('Total SOL locked in candy configs: ' + str(t / 1000000000))
print('Among ' + str(c) + ' configs')
print('Avg: ' + str((t/ 1000000000) / c))