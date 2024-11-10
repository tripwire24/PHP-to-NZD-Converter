const { useState, useEffect, useRef } = React;

function CurrencyConverter() {
    const [phpAmount, setPhpAmount] = useState('');
    const [nzdAmount, setNzdAmount] = useState('');
    const [rate, setRate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Fetch exchange rate
    useEffect(() => {
        fetchExchangeRate();
        // Fetch rate every hour
        const interval = setInterval(fetchExchangeRate, 3600000);
        return () => clearInterval(interval);
    }, []);

    const fetchExchangeRate = async () => {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/PHP');
            const data = await response.json();
            setRate(data.rates.NZD);
            setLastUpdated(new Date().toLocaleString());
            setError(null);
        } catch (err) {
            setError('Failed to fetch exchange rate. Using stored rate.');
            // Fallback rate
            setRate(0.027);
        }
    };

    const convertCurrency = (value) => {
        const amount = parseFloat(value);
        if (!isNaN(amount) && rate) {
            setNzdAmount((amount * rate).toFixed(2));
        } else {
            setNzdAmount('');
        }
    };

    const handlePhpChange = (e) => {
        const value = e.target.value;
        setPhpAmount(value);
        convertCurrency(value);
    };

    const saveAndReset = () => {
        if (phpAmount && nzdAmount) {
            const newEntry = {
                id: Date.now(),
                php: phpAmount,
                nzd: nzdAmount,
                rate: rate,
                timestamp: new Date().toLocaleString()
            };
            setHistory([newEntry, ...history.slice(0, 9)]);
            setPhpAmount('');
            setNzdAmount('');
        }
    };

    // Camera functions...
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setShowCamera(true);
            }
        } catch (err) {
            setError('Camera access denied. Please check your permissions.');
        }
    };

    const captureImage = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);

        setIsLoading(true);
        try {
            const result = await Tesseract.recognize(
                canvas.toDataURL('image/png'),
                'eng',
                { logger: m => console.log(m) }
            );

            const numbers = result.data.text.match(/\d+(\.\d+)?/);
            if (numbers) {
                setPhpAmount(numbers[0]);
                convertCurrency(numbers[0]);
            }
        } catch (err) {
            setError('Failed to process image. Please enter amount manually.');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen p-4 space-y-6">
            {/* Main converter card */}
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white text-center">PHP to NZD Converter</h1>
                    {lastUpdated && (
                        <p className="text-indigo-100 text-sm text-center mt-1">
                            Rate: 1 PHP = {rate?.toFixed(4)} NZD (Updated: {lastUpdated})
                        </p>
                    )}
                </div>
                
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (PHP)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={phpAmount}
                                    onChange={handlePhpChange}
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Enter amount in PHP"
                                />
                                <button
                                    onClick={startCamera}
                                    className="text-indigo-600 hover:text-indigo-800 focus:outline-none transition"
                                    aria-label="Open camera"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                        <circle cx="12" cy="13" r="3" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (NZD)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={nzdAmount}
                                    readOnly
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <span className="text-gray-500">NZD</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveAndReset}
                            disabled={!phpAmount || !nzdAmount}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save & Reset
                        </button>

                        {isLoading && (
                            <div className="text-center text-gray-600 animate-pulse">
                                Processing image...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History section */}
            {history.length > 0 && (
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-4">
                        <h2 className="text-xl font-bold text-white text-center">Conversion History</h2>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-auto">
                        {history.map(entry => (
                            <div key={entry.id} className="p-4 hover:bg-gray-50 transition">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-lg font-medium text-gray-900">₱{entry.php}</span>
                                        <span className="mx-2 text-gray-500">→</span>
                                        <span className="text-lg font-medium text-indigo-600">NZ${entry.nzd}</span>
                                    </div>
                                    <span className="text-sm text-gray-500">{entry.timestamp}</span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Rate: 1 PHP = {entry.rate?.toFixed(4)} NZD
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Camera modal */}
            {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-4 rounded-2xl w-full max-w-md">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded-lg"
                        />
                        <div className="mt-4 flex justify-between gap-4">
                            <button
                                onClick={() => {
                                    const stream = videoRef.current.srcObject;
                                    if (stream) {
                                        stream.getTracks().forEach(track => track.stop());
                                    }
                                    setShowCamera(false);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={captureImage}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                                Capture
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
