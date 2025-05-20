

# import socket
# import numpy as np
# import cv2
# from pynput.mouse import Controller as MouseController
# from pynput.keyboard import Controller as KeyboardController
# import threading

# # Set up socket for receiving video stream
# client_ip = '10.250.48.116'  # Local IP of host machine
# server_port = 12345
# sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# sock.bind((client_ip, server_port))

# # Initialize video display
# cv2.namedWindow("Remote Game", cv2.WINDOW_NORMAL)

# # Mouse and keyboard control (use pynput)
# mouse_controller = MouseController()
# keyboard_controller = KeyboardController()

# def handle_input():
#     # Capture and send user input (mouse, keyboard) to the host
#     pass  # Use pynput to detect mouse and keyboard inputs

# # Start input handling in a separate thread
# input_thread = threading.Thread(target=handle_input)
# input_thread.start()

# while True:
#     # Receive video data
#     img_len = int.from_bytes(sock.recv(4), byteorder='big')
#     img_data = b""
#     while len(img_data) < img_len:
#         img_data += sock.recv(4096)
    
#     # Decode image and display it
#     img_array = np.frombuffer(img_data, dtype=np.uint8)
#     img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

#     if img is not None:
#         cv2.imshow("Remote Game", img)

#     if cv2.waitKey(1) & 0xFF == 27:  # Press ESC to exit
#         break

# cv2.destroyAllWindows()
# sock.close()

# Read matrix dimensions
m, n = map(int, input("Enter rows and cols for matrix A: ").split())
A = []
print("Enter matrix A:")
for _ in range(m):
    A.append(list(map(int, input().split())))

n2, p = map(int, input("Enter rows and cols for matrix B: ").split())
B = []
print("Enter matrix B:")
for _ in range(n2):
    B.append(list(map(int, input().split())))

# Check if multiplication is possible
if n != n2:
    print("Matrix multiplication not possible. Columns of A must equal rows of B.")
else:
    # Initialize result matrix with 0s
    C = [[0] * p for _ in range(m)]

    # Perform multiplication
    for i in range(m):
        for j in range(p):
            for k in range(n):
                C[i][j] += A[i][k] * B[k][j]

    # Print the result
    print("Resultant Matrix C (A x B):")
    for row in C:
        print(" ".join(map(str, row)))
