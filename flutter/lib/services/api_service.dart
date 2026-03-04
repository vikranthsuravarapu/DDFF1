import 'package:dio/dio.dart';
import '../core/constants.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));

  Future<Response> getHomeData() async {
    return await _dio.get('/api/mobile/home');
  }

  Future<Response> getProducts({String? category}) async {
    return await _dio.get('/api/products', queryParameters: {
      if (category != null) 'category': category,
    });
  }

  Future<Response> login(String email, String password) async {
    return await _dio.post('/api/auth/login', data: {
      'email': email,
      'password': password,
    });
  }

  Future<Response> placeOrder(Map<String, dynamic> orderData, String token) async {
    return await _dio.post(
      '/api/orders',
      data: orderData,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }
}
