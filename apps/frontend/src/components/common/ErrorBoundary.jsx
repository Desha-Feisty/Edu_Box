import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    onReset={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

function ErrorFallback({ error, onReset }) {
    const navigate = useNavigate();

    return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
            <div className="bg-white dark:bg-base-200 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Something went wrong
                </h2>

                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {error?.message || "An unexpected error occurred. Please try again."}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onReset}
                        className="btn-brand"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="btn btn-ghost gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ErrorBoundary;