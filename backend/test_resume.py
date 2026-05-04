import sys
sys.path.insert(0, '.')
from resume_parser import analyze_resume

class FakeFile:
    filename = 'test.txt'
    def read(self):
        return b'Python machine learning data analysis pandas numpy sql'
    def seek(self, n):
        pass

r = analyze_resume(FakeFile())
print('Skills:', r['resume']['skills'])
print('Jobs:', len(r['recommendations']))
print('Titles:', [j['title'] for j in r['recommendations'][:3]])
