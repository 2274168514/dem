import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as Recharts from 'recharts';
import ReactDom from 'react-dom/client';

interface JsVisualizerProps {
  code: string;
}

export const JsVisualizer: React.FC<JsVisualizerProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';
    setError(null);

    // Check if code is empty
    if (!code || code.trim() === '') {
      return;
    }

    const executeCode = () => {
      try {
        // Check for Babel
        if (!(window as any).Babel) {
          throw new Error('Babel is not loaded. Please refresh the page.');
        }

        // Transform code using Babel to support JSX
        let transformedCode = '';
        try {
          const result = (window as any).Babel.transform(code, {
            presets: ['react'],
            filename: 'user_code.js',
          });
          transformedCode = result.code;
        } catch (transformError: any) {
          throw new Error(`Syntax Error: ${transformError.message}`);
        }

        // Wrap user code in a function and provide necessary variables
        const userCodeWrapper = `
          (function(container, d3, Recharts, React, ReactDom) {
            try {
              ${transformedCode}
              return { success: true };
            } catch (e) {
              console.error("Runtime Error in Visualizer:", e);
              return { success: false, error: e.message };
            }
          })
        `;

        // Execute
        // eslint-disable-next-line no-eval
        const renderFunc = eval(userCodeWrapper);
        
        const result = renderFunc(
          containerRef.current,
          d3,
          Recharts,
          React,
          ReactDom
        );

        if (result && !result.success) {
          throw new Error(result.error);
        }

      } catch (err: any) {
        console.error("Visualization Error:", err);
        setError(err.message || 'Error executing visualization script');
      }
    };

    // Small timeout to ensure DOM is ready and Babel is loaded
    const timer = setTimeout(executeCode, 0);

    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="w-full h-full">
      {error ? (
        <div className="text-red-500 bg-red-50 p-4 rounded border border-red-100">
          <strong>Runtime Error:</strong> {error}
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
};
