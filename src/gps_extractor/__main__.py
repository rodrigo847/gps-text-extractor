from gps_extractor.server import create_server


def main() -> None:
    server = create_server()
    print(f"Prototipo disponivel em http://{server.server_address[0]}:{server.server_address[1]}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
