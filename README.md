## Travel AI Assistant

Ứng dụng backend NestJS hỗ trợ người dùng lên kế hoạch du lịch thông qua hội thoại với AI.  
Luồng cơ bản: **đăng ký / đăng nhập → gọi API hội thoại `/travel/conversation` → nhận trạng thái `PLAN_READY` và hiển thị lịch trình.**

> Mặc định server chạy ở `http://localhost:8888` (có thể thay đổi trong cấu hình NestJS).

### 1. Đăng ký tài khoản

- **Endpoint**: `POST /api/auth/register`  
- **Body (JSON)**:

```json
{
  "email": "user@example.com",
  "fullName": "Nguyen Van A",
  "password": "your-password",
  "confirmPassword": "your-password"
}
```

Nếu thành công, API sẽ tạo user mới trong hệ thống.

### 2. Đăng nhập và lấy JWT

- **Endpoint**: `POST /api/auth/login`  
- **Body (JSON)**:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

- **Response** (ví dụ):

```json
{
    "success": true,
    "statusCode": 201,
    "data": {
        "accessToken": "<JWT_ACCESS_TOKEN>",
        "user": {
            "id": 1,
            "email": "example@email.com",
            "fullName": "John Doe"
        }
    }
}
```

Lưu lại `accessToken` để gửi trong header `Authorization` khi gọi các API bảo vệ (bao gồm `/api/travel/**`).

### 3. Tương tác hội thoại với AI: `/travel/conversation`

- **Endpoint**: `POST /api/travel/conversation`  
- **Auth**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
- **Body (JSON)**:

```json
{
  "conversationId": 1, // optional: ID cuộc hội thoại trước đó, nếu có
  "message": "Mình muốn đi du lịch Đà Nẵng 3 ngày, budget khoảng 5 triệu."
}
```

- **Ý nghĩa**:
  - Lần đầu gọi, có thể bỏ `conversationId` hoặc để `null`: server sẽ tự tạo cuộc hội thoại mới và trả về `conversationId`.
  - Các lần sau, gửi lại `conversationId` + `message` mới để tiếp tục hội thoại trên cùng cuộc trò chuyện đó.

- **Response mẫu**:

1. **Thiếu thông tin / cần hỏi thêm** (`ASKING_MORE_INFO`):

```json
{
    "success": true,
    "statusCode": 201,
    "data": {
        "status": "ASKING_MORE_INFO",
        "conversationId": "8",
        "question": "Bạn dự định đi du lịch Nhật Bản trong bao nhiêu ngày, ngân sách dự kiến là bao nhiêu và bạn muốn ghé thăm những thành phố nào hay có sở thích cụ thể gì không?",
        "missingFields": [
            "destination",
            "days",
            "budget",
            "preferences"
        ]
    }
}
```

Bạn hiển thị `question` cho user và tiếp tục gửi câu trả lời qua `/travel/conversation` với cùng `conversationId`.

2. **Đang xử lý thêm thông tin, chưa đủ để lên plan** (`PENDING`):

```json
{
  "status": "PENDING",
  "conversationId": "1"
}
```

Trạng thái này thường xuất hiện khi AI chưa sẵn sàng tạo plan; frontend chỉ cần tiếp tục cho phép user nhắn thêm cho đến khi có `PLAN_READY`.

3. **Đã sẵn sàng lịch trình** (`PLAN_READY`):

```json
{
  "status": "PLAN_READY",
  "conversationId": "1",
  "plan": {
    "trip": {
      "destination": "Đà Nẵng",
      "country": "Việt Nam",
      "days": 3,
      "budget": {
        "currency": "VND",
        "total": 5000000
      }
    },
    "itinerary": [
      {
        "day": 1,
        "title": "Khám phá trung tâm Đà Nẵng"
        // ...
      }
    ]
  }
}
```

- **Cách hiển thị `PLAN_READY` trên frontend**:
  - Dựa vào `status === "PLAN_READY"` để biết đã có kết quả.
  - Lấy object `plan` trong response để render chi tiết:
    - `plan.trip.destination`, `plan.trip.country`, `plan.trip.days`, `plan.trip.budget`.
    - `plan.itinerary` để hiển thị lịch trình từng ngày (sáng/chiều/tối, khách sạn, nhà hàng...).

### 4. Lấy lại plan đã tạo: `/travel/plan`

Trong trường hợp frontend chỉ lưu `conversationId` và muốn load lại plan:

- **Endpoint**: `GET /travel/plan?conversationId=<ID>`  
- **Auth**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
- **Response**:

```json
{
    "success": true,
    "statusCode": 201,
    "data": {
        "status": "PLAN_READY",
        "conversationId": "9",
        "plan": {
            "trip": {
                "days": 5,
                "budget": {
                    "total": 200,
                    "currency": "USD"
                },
                "country": "Nhật Bản",
                "destination": "Ōsaka",
                "preferences": {
                    "food": [
                        "Takoyaki",
                        "Okonomiyaki",
                        "Kushikatsu",
                        "Street food"
                    ],
                    "activities": [
                        "Food exploration",
                        "Sightseeing"
                    ]
                }
            },
            "itinerary": [
                {
                    "day": 1,
                    "hotel": {
                        "name": "Hotel Nikko Osaka",
                        "address": "1 Chome-3-3 Nishishinsaibashi, Chuo Ward",
                        "price_per_night": 40
                    },
                    "title": "Khám phá văn hóa ẩm thực Dotonbori",
                    "evening": {
                        "activities": [
                            {
                                "name": "Trải nghiệm ẩm thực đêm Dotonbori",
                                "type": "Food",
                                "location": "Dotonbori, Chuo Ward",
                                "estimated_cost": 30
                            }
                        ]
                    },
                    "morning": {
                        "activities": [
                            {
                                "name": "Tham quan Chùa Hozenji",
                                "type": "Cultural",
                                "location": "1 Chome-2-16 Namba, Chuo Ward",
                                "estimated_cost": 0
                            }
                        ]
                    },
                    "afternoon": {
                        "activities": [
                            {
                                "name": "Đi dạo khu mua sắm Shinsaibashi",
                                "type": "Shopping",
                                "location": "Shinsaibashisuji, Chuo Ward",
                                "estimated_cost": 0
                            }
                        ]
                    }
                },
                {
                    "day": 2,
                    "hotel": {
                        "name": "Hotel Nikko Osaka",
                        "price_per_night": 40
                    },
                    "title": "Lịch sử và Đặc sản Shinsekai",
                    "evening": {
                        "activities": [
                            {
                                "name": "Thưởng thức Kushikatsu",
                                "type": "Food",
                                "location": "Shinsekai district",
                                "estimated_cost": 25
                            }
                        ]
                    },
                    "morning": {
                        "activities": [
                            {
                                "name": "Lâu đài Osaka",
                                "type": "Sightseeing",
                                "location": "1-1 Osakajo, Chuo Ward",
                                "estimated_cost": 5
                            }
                        ]
                    },
                    "afternoon": {
                        "activities": [
                            {
                                "name": "Tham quan khu Shinsekai",
                                "type": "Culture",
                                "location": "Ebisu-higashi, Naniwa Ward",
                                "estimated_cost": 0
                            }
                        ]
                    }
                },
                {
                    "day": 3,
                    "hotel": {
                        "name": "Hotel Nikko Osaka",
                        "price_per_night": 40
                    },
                    "title": "Trải nghiệm văn hóa tại Namba",
                    "evening": {
                        "activities": [
                            {
                                "name": "Tận hưởng không khí đêm tại Namba",
                                "type": "Leisure",
                                "location": "Namba, Chuo Ward",
                                "estimated_cost": 15
                            }
                        ]
                    },
                    "morning": {
                        "activities": [
                            {
                                "name": "Đền Namba Yasaka",
                                "type": "Cultural",
                                "location": "2 Chome-9-19 Motomachi, Naniwa Ward",
                                "estimated_cost": 0
                            }
                        ]
                    },
                    "afternoon": {
                        "activities": [
                            {
                                "name": "Kuromon Ichiba Market",
                                "type": "Food",
                                "location": "2 Chome-4-1 Nipponbashi, Chuo Ward",
                                "estimated_cost": 20
                            }
                        ]
                    }
                },
            ]
        }
    }
}
```