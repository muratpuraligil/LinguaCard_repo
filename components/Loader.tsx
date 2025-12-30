
import React from 'react';

export const PulseLoader = () => (
    <div className="flex items-center gap-1.5 h-12">
        <div className="w-8 h-12 bg-blue-600 rounded-lg animate-pulse"></div>
        <div className="w-8 h-12 bg-blue-500 rounded-lg animate-pulse [animation-delay:0.2s]"></div>
    </div>
);
