#!/usr/bin/python
import socket, os, time, shutil, signal
from multiprocessing import Process, current_process, freeze_support
from SocketServer import BaseServer, ThreadingMixIn
from optparse import OptionParser
import ssl
import posixpath
import BaseHTTPServer
import urllib, urllib2
import cgi

class SecureHTTPServer(ThreadingMixIn, BaseHTTPServer.HTTPServer):
	def __init__(self, server_address, HandlerClass, options):
		BaseServer.__init__(self, server_address, HandlerClass)

		self.options = options

		self.daemon_threads = True
		self.protocol_version = 'HTTP/1.1'

		self.socket = ssl.wrap_socket(socket.socket(self.address_family, self.socket_type),
				keyfile=self.options.key, certfile=self.options.cert, server_side=True, ssl_version=ssl.PROTOCOL_SSLv3)

		self.server_bind()
		self.server_activate()

class RequestHandler(BaseHTTPServer.BaseHTTPRequestHandler):
	def __init__(self, request, client_address, server):
		BaseHTTPServer.BaseHTTPRequestHandler.__init__(self, request, client_address, server)

	def address_string(self):
		return self.client_address[0]

	def do_POST(self):
		length = int(self.headers.getheader('content-length'))

		query = self.rfile.read(length)

		req = urllib2.Request(self.server.options.url, query, self.headers)

		try:
			response = urllib2.urlopen(req)
		except urllib2.URLError, e:
			response = e
		finally:
			try:
				data = response.read()
				self.send_response(response.code)
				self.send_header("Content-Length", len(data))
				self.send_header("Last-Modified", time.time())
				self.end_headers()
				if data:
					self.request.send(data)
			except:
				self.send_error(404, "File not found")

	def do_GET(self):
		f = self.send_head()
		if f:
			self.copyfile(f, self.wfile)
			f.close()

	def do_HEAD(self):
		f = self.send_head()

	def translate_path(self, path):
		# abandon query parameters
		path = path.split('?',1)[0]
		path = path.split('#',1)[0]
		path = posixpath.normpath(urllib.unquote(path))
		words = path.split('/')
		words = filter(None, words)
		path = os.getcwd()
		for word in words:
			drive, word = os.path.splitdrive(word)
			head, word = os.path.split(word)
			if word in (os.curdir, os.pardir): continue
			path = os.path.join(path, word)
		return path

	def copyfile(self, source, outputfile):
		shutil.copyfileobj(source, outputfile)

	def send_head(self):
		path = self.translate_path(self.path)
		f = None
		if os.path.isdir(path):
			if not self.path.endswith('/'):
				# redirect browser - doing basically what apache does
				self.send_response(301)
				self.send_header("Location", self.path + "/")
				self.end_headers()
				return None
			for index in "index.html", "index.htm":
				index = os.path.join(path, index)
				if os.path.exists(index):
					path = index
					break

		try:
			# Only serve files with trusted extensions
			# to prevent accidentially serving our
			# SSL keyfile
			ext = os.path.splitext(path)[1]
			if not ext in ['.html', '.css', '.js', '.json', '.png', '.jpeg', '.jpg']:
				raise IOError

			# Always read in binary mode. Opening files in text mode may cause
			# newline translations, making the actual size of the content
			# transmitted *less* than the content-length!
			f = open(path, 'rb')
		except IOError:
			self.send_error(404, "File not found")
			return None
		self.send_response(200)
		fs = os.fstat(f.fileno())
		self.send_header("Content-Length", str(fs[6]))
		self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
		self.end_headers()
		return f

def serve_forever(server):
	try:
		server.serve_forever()
	except KeyboardInterrupt:
		pass


def runpool(options):
	server = SecureHTTPServer(('', options.port), RequestHandler, options)

	# create child processes to act as workers
	for i in range(options.procs-1):
		Process(target=serve_forever, args=(server,)).start()

	# main process also acts as a worker
	serve_forever(server)

parser = OptionParser()
parser.add_option('-r', dest='url', default='http://localhost:8332/',   help='URL to bitcoin RPC (default: %default)')
parser.add_option('-p', dest='port', type="int",  default=8338,   help='listen port (default: %default)')
parser.add_option('-n', dest='procs', type="int", default=4,   help='number of HTTP processes (default: %default)')
parser.add_option('-k', dest='key', default='server.pem',   help='.pem (default: %default)')
parser.add_option('-c', dest='cert', default='server.cert',   help='.cert (default: %default)')

(options, args) = parser.parse_args()

freeze_support()

print 'Ctrl-C to exit'

runpool(options)
