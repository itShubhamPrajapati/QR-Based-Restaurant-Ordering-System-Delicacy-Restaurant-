import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Download, Printer, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRCodesPage() {
  const [qrCodes, setQrCodes] = useState([])
  const [copied, setCopied] = useState(null)
  const [baseUrl, setBaseUrl] = useState(window.location.origin)
  
  useEffect(() => {
    // Generate QR codes for all 5 tables
    const codes = []
    for (let i = 1; i <= 5; i++) {
      codes.push({
        tableNumber: i,
        url: `${baseUrl}/table/${i}`
      })
    }
    setQrCodes(codes)
  }, [baseUrl])
  
  const handleCopy = (url, tableNumber) => {
    navigator.clipboard.writeText(url)
    setCopied(tableNumber)
    setTimeout(() => setCopied(null), 2000)
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
                >
                  <Home className="w-5 h-5" />
                </motion.button>
              </Link>
              <h1 className="text-xl font-bold">📱 QR Codes</h1>
            </div>
            
            <button
              onClick={handlePrint}
              className="btn-primary text-sm py-2"
            >
              <Printer className="w-4 h-4 mr-1" /> Print All
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-2 dark:text-white">Printable QR Codes</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Print these QR codes and place them on each table. Customers can scan them to place orders.
          </p>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Base URL (for development)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="input-field flex-1"
                placeholder="http://localhost:5173"
              />
            </div>
          </div>
        </motion.div>
        
        {/* QR Codes Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {qrCodes.map((qr, index) => (
            <motion.div
              key={qr.tableNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-6 text-center"
            >
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG
                  value={qr.url}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              {/* Table Number */}
              <h3 className="text-xl font-bold mb-2 dark:text-white">
                Table {qr.tableNumber}
              </h3>
              
              {/* URL */}
              <p className="text-sm text-gray-500 mb-4 break-all">
                {qr.url}
              </p>
              
              {/* Actions */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleCopy(qr.url, qr.tableNumber)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Copy URL"
                >
                  {copied === qr.tableNumber ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 dark:text-white" />
                  )}
                </button>
                <a
                  href={qr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Test URL"
                >
                  <Download className="w-5 h-5 dark:text-white" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6 mt-6"
        >
          <h2 className="text-lg font-semibold mb-4 dark:text-white">How to Use</h2>
          <ol className="space-y-2 text-gray-600 dark:text-gray-400">
            <li>1. Print this page or download individual QR codes</li>
            <li>2. Laminate or protect the QR codes for durability</li>
            <li>3. Place each QR code on its respective table</li>
            <li>4. Customers scan with their phone camera to open the menu</li>
            <li>5. Orders will appear in real-time on the Kitchen Panel</li>
          </ol>
        </motion.div>
      </div>
    </div>
  )
}
