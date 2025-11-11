import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            React Boilerplate
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Welcome to Your React App
              </h2>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setCount((count) => count + 1)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Count is {count}
                </button>

                <button
                  onClick={() => setCount(0)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                This is a modern React boilerplate with TypeScript, Tailwind CSS, and Vite.
                Edit files in the <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">src</code> folder to get started.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
