import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// The main App component for the floor plan designer.
const App = () => {
    // State to hold all floor plan elements.
    const [elements, setElements] = useState([]);
    // State for the currently selected element.
    const [selectedElement, setSelectedElement] = useState(null);
    // State to track if the user is dragging an element.
    const [isDragging, setIsDragging] = useState(false);
    // State to track if the user is resizing an element.
    const [isResizing, setIsResizing] = useState(false);
    // Stores the starting position for drag and resize operations.
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialWidth: 0, initialHeight: 0 });
    // Ref for the canvas element to get its context.
    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);

    // Initial canvas dimensions. Will be adjusted for responsiveness.
    const canvasWidth = 800;
    const canvasHeight = 600;

    // Helper function to draw all elements on the canvas.
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        elements.forEach(el => {
            ctx.fillStyle = el.color;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;

            ctx.save();
            ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
            ctx.rotate(el.rotation * Math.PI / 180);

            if (el.type === 'Meja') {
                ctx.fillStyle = '#6b4f4f';
                ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
            } else if (el.type === 'Kursi') {
                ctx.fillStyle = '#8d6e63';
                ctx.beginPath();
                ctx.arc(0, 0, el.width / 2, 0, 2 * Math.PI);
                ctx.fill();
            } else if (el.type === 'Pintu') {
                ctx.fillStyle = '#c4a79d';
                ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
                ctx.strokeStyle = '#5c4033';
                ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
            } 

            ctx.restore();

            // Draw a resizing handle if the element is selected.
            if (selectedElement && selectedElement.id === el.id) {
                const handleSize = 8;
                const handleX = el.x + el.width - handleSize / 2;
                const handleY = el.y + el.height - handleSize / 2;
                ctx.fillStyle = '#3498db';
                ctx.fillRect(handleX, handleY, handleSize, handleSize);
            }
        });
    };

    // Use a useEffect hook to redraw the canvas whenever elements change.
    useEffect(() => {
        drawCanvas();
    }, [elements, selectedElement]);

    // Handle mouse down event on the canvas.
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check for resize handle click first.
        const resizeHandleSize = 8;
        if (selectedElement) {
            const handleX = selectedElement.x + selectedElement.width - resizeHandleSize / 2;
            const handleY = selectedElement.y + selectedElement.height - resizeHandleSize / 2;
            if (mouseX >= handleX && mouseX <= handleX + resizeHandleSize &&
                mouseY >= handleY && mouseY <= handleY + resizeHandleSize) {
                setIsResizing(true);
                setDragStart({ x: mouseX, y: mouseY, initialWidth: selectedElement.width, initialHeight: selectedElement.height });
                return;
            }
        }

        // Check for element click/drag.
        const clickedElement = elements.find(el =>
            mouseX > el.x && mouseX < el.x + el.width &&
            mouseY > el.y && mouseY < el.y + el.height
        );

        if (clickedElement) {
            setIsDragging(true);
            setSelectedElement(clickedElement);
            setDragStart({ x: mouseX - clickedElement.x, y: mouseY - clickedElement.y });
        } else {
            setIsDragging(false);
            setSelectedElement(null);
        }
    };

    // Handle mouse move event on the canvas.
    const handleMouseMove = (e) => {
        if (!isDragging && !isResizing) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDragging) {
            setElements(prevElements =>
                prevElements.map(el =>
                    el.id === selectedElement.id ?
                    { ...el, x: mouseX - dragStart.x, y: mouseY - dragStart.y } :
                    el
                )
            );
        } else if (isResizing) {
            setElements(prevElements =>
                prevElements.map(el => {
                    if (el.id === selectedElement.id) {
                        const newWidth = dragStart.initialWidth + (mouseX - dragStart.x);
                        const newHeight = dragStart.initialHeight + (mouseY - dragStart.y);
                        return {
                            ...el,
                            width: Math.max(10, newWidth),
                            height: Math.max(10, newHeight)
                        };
                    }
                    return el;
                })
            );
        }
    };

    // Handle mouse up event to stop dragging or resizing.
    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // Handle dropping an element from the sidebar onto the canvas.
    const handleDrop = (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        const rect = canvasRef.current.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        const newElement = {
            id: Date.now(),
            type,
            x: dropX - 25, // Center the element
            y: dropY - 25,
            width: 50,
            height: 50,
            rotation: 0,
        };

        setElements(prevElements => [...prevElements, newElement]);
    };

    // Prevent default behavior for drag over.
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Handle drag start from the sidebar.
    const handleDragStart = (e, type) => {
        e.dataTransfer.setData('text/plain', type);
    };

    // Handle save layout functionality.
    const handleSave = async () => {
        try {
            const response = await fetch('/api/save-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(elements),
            });
            const result = await response.json();
            console.log('Layout saved:', result);
        } catch (error) {
            console.error('Failed to save layout:', error);
            alert('Failed to save layout. Make sure the server is running.');
        }
    };

    // Handle load layout functionality.
    const handleLoad = async () => {
        try {
            const response = await fetch('/api/get-layout');
            const result = await response.json();
            setElements(result);
            console.log('Layout loaded:', result);
        } catch (error) {
            console.error('Failed to load layout:', error);
            alert('Failed to load layout. Make sure the server is running and a layout has been saved.');
        }
    };

    // Function to rotate the selected element.
    const handleRotate = () => {
        if (!selectedElement) return;
        setElements(prevElements =>
            prevElements.map(el =>
                el.id === selectedElement.id ?
                { ...el, rotation: (el.rotation + 45) % 360 } :
                el
            )
        );
    };

    return (
        <div className="flex flex-col h-screen font-inter bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md p-4 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Perancang Denah Lantai Interaktif</h1>
            </header>

            {/* Main content area */}
            <main className="flex flex-1 p-6 space-x-6">
                {/* Sidebar for drag-and-drop elements */}
                <aside className="w-64 bg-white p-6 rounded-lg shadow-lg flex-shrink-0">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Elemen Denah Lantai</h2>
                    <div className="flex flex-col space-y-4">
                        {['Meja', 'Kursi', 'Pintu'].map(type => (
                            <button
                                key={type}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, type)}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    {/* Control buttons */}
                    <div className="mt-8 space-y-4">
                         <h2 className="text-xl font-semibold mb-2 text-gray-700">Kontrol</h2>
                         <button
                             onClick={handleRotate}
                             disabled={!selectedElement}
                             className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${!selectedElement ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md'}`}
                         >
                             Putar
                         </button>
                         <button
                             onClick={handleSave}
                             className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                         >
                             Simpan Tata Letak
                         </button>
                         <button
                             onClick={handleLoad}
                             className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                         >
                             Muat Tata Letak
                         </button>
                    </div>
                </aside>

                {/* Canvas container and info panel */}
                <div className="flex-1 flex flex-col items-center space-y-4">
                    {/* Canvas Info Panel */}
                    <div className="bg-white p-4 rounded-lg shadow-lg w-full text-center">
                        <p className="text-sm text-gray-600">
                            Seret elemen dari bilah sisi ke kanvas. Klik untuk memilih. Seret sudut kanan bawah untuk mengubah ukuran.
                        </p>
                        {selectedElement && (
                            <p className="mt-2 text-sm font-semibold text-gray-800">
                                Elemen terpilih: <span className="font-normal">{selectedElement.type}</span> |
                                Posisi: <span className="font-normal">({selectedElement.x}, {selectedElement.y})</span> |
                                Ukuran: <span className="font-normal">{selectedElement.width}x{selectedElement.height}</span> |
                                Rotasi: <span className="font-normal">{selectedElement.rotation}°</span>
                            </p>
                        )}
                    </div>
                    
                    {/* Canvas Area */}
                    <div
                        ref={canvasContainerRef}
                        className="flex-1 bg-white rounded-lg shadow-xl border-2 border-dashed border-gray-300 overflow-hidden"
                    >
                        <canvas
                            ref={canvasRef}
                            width={canvasWidth}
                            height={canvasHeight}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="bg-white block w-full h-full"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

// ====================================================================
// Instructions for running the backend (Node.js/Express)
// ====================================================================
/*
This application uses a simple backend for saving and loading data.
You need to create a separate file for the backend.

1.  Create a folder named `backend`.
2.  Inside the `backend` folder, create a file named `server.js`.
3.  Copy the code below into the `server.js` file:
*/
/*
// server.js (backend)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Required for cross-origin requests

const app = express();
const port = 3001;

// Use CORS to allow requests from the React app
app.use(cors());
// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// In-memory storage for the layout
let layoutData = [];

// API endpoint to save the layout
app.post('/api/save-layout', (req, res) => {
    layoutData = req.body;
    console.log('Layout saved successfully.');
    res.json({ message: 'Layout saved successfully.' });
});

// API endpoint to get the layout
app.get('/api/get-layout', (req, res) => {
    res.json(layoutData);
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
*/
/*
4.  Inside the `backend` folder, open your terminal and run the following commands to install dependencies:
    `npm init -y`
    `npm install express cors body-parser`

5.  To start the backend server, run this command in your terminal inside the `backend` folder:
    `node server.js`

6.  Now, you can run the React application. Make sure the backend server is running first!
*/

// React 18+ way to render the app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
