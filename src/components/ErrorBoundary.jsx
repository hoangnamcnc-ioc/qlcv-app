import React from "react";

// Chặn lỗi JS cục bộ (VD: 1 màn hình bị lỗi dữ liệu) để không làm sập toàn bộ ứng dụng.
// React chỉ hỗ trợ bắt lỗi render qua class component (chưa có hook tương đương).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  // "Thử lại" chỉ reset state lỗi cục bộ — nếu nguyên nhân là DỮ LIỆU truyền vào (props) vẫn hỏng
  // (VD: modal đang mở là 1 task thiếu field), re-render với y nguyên props sẽ lập tức crash lại,
  // khiến người dùng thấy "bấm Thử lại không ăn thua". onRetry cho phép cha dọn luôn state gây lỗi
  // (VD: đóng modal) trước khi bỏ màn hình lỗi, để lần render sau chắc chắn khác đi.
  reset = () => { this.props.onRetry?.(); this.setState({ error: null }); };

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, textAlign: "center", background: "#fff", borderRadius: 10, border: "1px solid #fecaca", margin: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#b91c1c", marginBottom: 6 }}>
            {this.props.label ? `Đã xảy ra lỗi ở ${this.props.label}` : "Đã xảy ra lỗi"}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            Phần còn lại của phần mềm vẫn hoạt động bình thường. Bạn có thể thử lại hoặc chuyển sang mục khác.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={this.reset} style={{ padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Thử lại</button>
            <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Tải lại trang</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
