const { useState, useEffect, useRef } = React;

function CurrencyConverter() {
    const [phpAmount, setPhpAmount] = useState('');
    const [nzdAmount, setNzdAmount] = useState('');
    const [rate, setRate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expandedItem, setExpandedItem] = useState(null);
    const [expandedImage, setExpandedImage] = useState(null);
    const videoRef = useRef(null);
    const photoRef = useRef(null);

    // Data persistence useEffect
    useEffect(() => {
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
        
        const loadSavedData = () => {
            const savedHistory = localStorage.getItem('conversionHistory');
            if (savedHistory) {
                try {
                    setHistory(JSON.parse(savedHistory));
                } catch (e) {
                    console.error('Error loading saved data:', e);
                    localStorage.removeItem('conversionHistory');
                }
            }
        };

        loadSavedData();
        window.addEventListener('storage', loadSavedData);
        window.addEventListener('historyUpdate', loadSavedData);

        return () => {
            window.removeEventListener('storage', loadSavedData);
            window.removeEventListener('historyUpdate', loadSavedData);
        };
    }, []);    

    // Storage check useEffect
    useEffect(() => {
        const checkStorage = async () => {
            try {
                const estimate = await navigator.storage.estimate();
                const percentageUsed = (estimate.usage / estimate.quota) * 100;
                if (percentageUsed > 80) {
                    setError('Storage space is running low. Consider deleting some photos.');
                }
            } catch (err) {
                console.log('Storage estimation not available');
            }
        };
        
        checkStorage();
    }, [history]);

    // Exchange rate fetch function
    const fetchExchangeRate = async () => {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/PHP');
            const data = await response.json();
            setRate(data.rates.NZD);
            setLastUpdated(new Date().toLocaleString());
            setError(null);
        } catch (err) {
            setError('Failed to fetch exchange rate. Using stored rate.');
            setRate(0.027); // Fallback rate
        }
    };

    // Exchange rate fetch useEffect
    useEffect(() => {
        fetchExchangeRate();
        const interval = setInterval(fetchExchangeRate, 3600000);
        return () => clearInterval(interval);
    }, []);
    const StarRating = ({ rating, onRatingChange }) => {
        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onRatingChange(star)}
                        className="focus:outline-none"
                    >
                        <svg
                            className={`w-6 h-6 ${
                                star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </button>
                ))}
            </div>
        );
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

    const handleHistoryItemExpand = (id) => {
        setExpandedItem(expandedItem === id ? null : id);
    };

    const handleStoreNameUpdate = (id, storeName) => {
        const newHistory = history.map(item => {
            if (item.id === id) {
                return { ...item, storeName };
            }
            return item;
        });
        setHistory(newHistory);
        localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
    };

    const handleRatingUpdate = (id, rating) => {
        const newHistory = history.map(item => {
            if (item.id === id) {
                return { ...item, rating };
            }
            return item;
        });
        setHistory(newHistory);
        localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
    };

    // Handle photo capture function
const handlePhotoCapture = async (id, photoNumber) => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });

        // Create and add camera UI
        const cameraUI = document.createElement('div');
        cameraUI.innerHTML = `
            <div class="fixed inset-0 bg-black z-50 flex flex-col">
                <video autoplay playsinline class="h-full w-full object-cover"></video>
                <div class="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4">
                    <button class="capture-btn bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                        <span class="text-3xl">📸</span>
                    </button>
                    <button class="cancel-btn bg-red-500 text-white px-4 py-2 rounded-lg">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(cameraUI);

        const video = cameraUI.querySelector('video');
        video.srcObject = stream;
        await video.play();

        return new Promise((resolve, reject) => {
            const captureBtn = cameraUI.querySelector('.capture-btn');
            const cancelBtn = cameraUI.querySelector('.cancel-btn');

            cancelBtn.onclick = () => {
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(cameraUI);
                reject('Camera cancelled');
            };

            captureBtn.onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);

                // Compress the image
                const photoData = canvas.toDataURL('image/jpeg', 0.7); // 70% quality

                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(cameraUI);

                // Update history with new photo
                const newHistory = history.map(item => {
                    if (item.id === id) {
                        return {
                            ...item,
                            [`photo${photoNumber}`]: photoData
                        };
                    }
                    return item;
                });
                setHistory(newHistory);
                localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
                resolve();
            };
        });
    } catch (err) {
        setError('Camera access denied or not available. Please check your permissions.');
    }
};
    // Separate saveAndReset function
    const saveAndReset = () => {
        if (phpAmount && nzdAmount) {
            const newEntry = {
                id: Date.now(),
                php: phpAmount,
                nzd: nzdAmount,
                rate: rate,
                timestamp: new Date().toLocaleString(),
                storeName: '',
                rating: 0,
                photo1: null,
                photo2: null
            };
            const newHistory = [newEntry, ...history.slice(0, 9)];
            setHistory(newHistory);
            localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
            setPhpAmount('');
            setNzdAmount('');
        }
    };

    const deleteHistoryItem = (id) => {
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
    };

    const deleteAllHistory = () => {
        setHistory([]);
        localStorage.removeItem('conversionHistory');
        setShowDeleteConfirm(false);
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
                        {/* PHP Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (PHP)
                            </label>
                            <input
                                type="number"
                                value={phpAmount}
                                onChange={handlePhpChange}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                placeholder="Enter amount in PHP"
                            />
                        </div>

                        {/* NZD Amount Display */}
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
                                Processing...
                            </div>
                        )}
                    </div>
                </div>
            </div>
{/* History section */}
{history.length > 0 && (
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Conversion History</h2>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-2xl hover:opacity-75 transition"
                        >
                            ⛔
                        </button>
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
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() => handleHistoryItemExpand(entry.id)}
                                            className="px-3 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                                        >
                                            {expandedItem === entry.id ? 'Less Info' : 'More Info'}
                                        </button>
                                        <button
                                            onClick={() => deleteHistoryItem(entry.id)}
                                            className="text-2xl hover:opacity-75 transition p-2"
                                            aria-label="Delete"
                                        >
                                            ⛔
                                        </button>
                                    </div>
                                </div>

                                {expandedItem === entry.id && (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Store Name
                                            </label>
                                            <input
                                                type="text"
                                                value={entry.storeName || ''}
                                                onChange={(e) => handleStoreNameUpdate(entry.id, e.target.value)}
                                                placeholder="Enter store name"
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Purchase Intent Rating
                                            </label>
                                            <StarRating
                                                rating={entry.rating || 0}
                                                onRatingChange={(rating) => handleRatingUpdate(entry.id, rating)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Photos
                                            </label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Photo 1 */}
                                                <div className="relative">
                                                    {entry.photo1 ? (
                                                        <div className="relative group">
                                                            <img
                                                                src={entry.photo1}
                                                                alt="Photo 1"
                                                                className="w-full h-32 object-cover rounded-lg cursor-pointer"
                                                                onClick={() => setExpandedImage(entry.photo1)}
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newHistory = history.map(item => {
                                                                        if (item.id === entry.id) {
                                                                            return { ...item, photo1: null };
                                                                        }
                                                                        return item;
                                                                    });
                                                                    setHistory(newHistory);
                                                                    localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
                                                                }}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePhotoCapture(entry.id, 1)}
                                                            className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                                                        >
                                                            <span className="text-4xl text-gray-400 mb-1">📷</span>
                                                            <span className="text-sm text-gray-500">Tap to capture</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Photo 2 */}
                                                <div className="relative">
                                                    {entry.photo2 ? (
                                                        <div className="relative group">
                                                            <img
                                                                src={entry.photo2}
                                                                alt="Photo 2"
                                                                className="w-full h-32 object-cover rounded-lg cursor-pointer"
                                                                onClick={() => setExpandedImage(entry.photo2)}
                                                            />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newHistory = history.map(item => {
                                                                        if (item.id === entry.id) {
                                                                            return { ...item, photo2: null };
                                                                        }
                                                                        return item;
                                                                    });
                                                                    setHistory(newHistory);
                                                                    localStorage.setItem('conversionHistory', JSON.stringify(newHistory));
                                                                }}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePhotoCapture(entry.id, 2)}
                                                            className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                                                        >
                                                            <span className="text-4xl text-gray-400 mb-1">📷</span>
                                                            <span className="text-sm text-gray-500">Tap to capture</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Rate: 1 PHP = {entry.rate?.toFixed(4)} NZD
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {entry.timestamp}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
{/* Delete All Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Delete All History?</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete all conversion history? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteAllHistory}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Image Modal */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
                    onClick={() => setExpandedImage(null)}
                >
                    <img 
                        src={expandedImage} 
                        alt="Expanded view" 
                        className="max-w-full max-h-full object-contain"
                    />
                    <button 
                        className="absolute top-4 right-4 text-white text-xl p-2"
                        onClick={() => setExpandedImage(null)}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Hidden video and canvas elements for photo capture */}
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                playsInline
            />
            <canvas
                ref={photoRef}
                style={{ display: 'none' }}
            />
        </div>
    );
}

// Render the app
ReactDOM.render(
    <CurrencyConverter />,
    document.getElementById('root')
);
